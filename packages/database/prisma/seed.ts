import { PrismaClient, type GameStatus, type PlayerPosition } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM_SEED = [
  { name: "Glacier", city: "Anchorage", abbreviation: "ANC", colorPrimary: "#1B4B8F", colorSecondary: "#0A0B0D", colorAccent: "#7FD8FF" },
  { name: "Ironhawks", city: "Pittsburgh", abbreviation: "PIT", colorPrimary: "#0A0B0D", colorSecondary: "#F2B705", colorAccent: "#F2B705" },
  { name: "Timberwolves", city: "Duluth", abbreviation: "DUL", colorPrimary: "#1F3D2B", colorSecondary: "#0A0B0D", colorAccent: "#8FE388" },
  { name: "Riptide", city: "Halifax", abbreviation: "HAL", colorPrimary: "#0A3D62", colorSecondary: "#F1F1F1", colorAccent: "#3FA7D6" },
  { name: "Blaze", city: "Tempe", abbreviation: "TMP", colorPrimary: "#0A0B0D", colorSecondary: "#D7263D", colorAccent: "#FF5E5B" },
  { name: "Northern Lights", city: "Fargo", abbreviation: "FAR", colorPrimary: "#221551", colorSecondary: "#F1F1F1", colorAccent: "#8C7AE6" },
] as const;

const POSITIONS: PlayerPosition[] = ["C", "LW", "RW", "D", "D", "G"];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.warn("Seeding AZHL database...");

  const league = await prisma.league.upsert({
    where: { slug: "azhl" },
    update: {},
    create: {
      name: "Arctic Zone Hockey League",
      shortName: "AZHL",
      slug: "azhl",
    },
  });

  // Anchored relative to "now" (not a fixed calendar month) so the seed always produces a
  // realistic mix of FINAL, LIVE, and SCHEDULED games regardless of when it's run.
  const now = new Date();
  const seasonStart = new Date(now);
  seasonStart.setDate(seasonStart.getDate() - 45);
  const seasonEnd = new Date(now);
  seasonEnd.setDate(seasonEnd.getDate() + 135);
  const seasonLabel = `${seasonStart.getFullYear()}-${String(seasonStart.getFullYear() + 1).slice(-2)}`;

  const season = await prisma.season.upsert({
    where: { id: `${league.id}-current` },
    update: { label: seasonLabel, startDate: seasonStart, endDate: seasonEnd },
    create: {
      id: `${league.id}-current`,
      leagueId: league.id,
      label: seasonLabel,
      startDate: seasonStart,
      endDate: seasonEnd,
      isCurrent: true,
    },
  });

  const teams = [];
  for (const teamData of TEAM_SEED) {
    const team = await prisma.team.upsert({
      where: { abbreviation: teamData.abbreviation },
      update: {},
      create: {
        ...teamData,
        slug: teamData.name.toLowerCase().replace(/\s+/g, "-"),
      },
    });
    teams.push(team);

    for (let i = 0; i < POSITIONS.length; i++) {
      const jerseyNumber = randomBetween(2, 98);
      await prisma.player.upsert({
        where: { teamId_jerseyNumber: { teamId: team.id, jerseyNumber } },
        update: {},
        create: {
          teamId: team.id,
          fullName: `${teamData.abbreviation} Player ${i + 1}`,
          jerseyNumber,
          position: POSITIONS[i] ?? "C",
        },
      });
    }
  }

  // Games have no natural unique key to upsert on, so re-running the seed clears and
  // regenerates this season's schedule rather than accumulating duplicates each run.
  await prisma.game.deleteMany({ where: { seasonId: season.id } });

  // Round-robin schedule: every team plays every other team home and away, spaced 2 days
  // apart starting a few days into the season — so roughly the first half lands in the past
  // (FINAL) and the second half in the future (SCHEDULED), with exactly one LIVE game: the
  // first chronologically upcoming one.
  let gameCount = 0;
  let liveAssigned = false;
  const scheduleStart = new Date(seasonStart);
  scheduleStart.setDate(scheduleStart.getDate() + 3);

  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      const home = teams[i];
      const away = teams[j];
      if (!home || !away) continue;

      const gameDate = new Date(scheduleStart);
      gameDate.setDate(gameDate.getDate() + gameCount * 2);

      const isPast = gameDate < now;
      let status: GameStatus;
      if (isPast) {
        status = "FINAL";
      } else if (!liveAssigned) {
        status = "LIVE";
        liveAssigned = true;
      } else {
        status = "SCHEDULED";
      }

      const hasScore = status === "FINAL" || status === "LIVE";
      const homeScore = hasScore ? randomBetween(1, 6) : null;
      const awayScore = hasScore ? randomBetween(1, 6) : null;

      await prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          startTime: gameDate,
          venue: `${home.city} Arena`,
          status,
          homeScore,
          awayScore,
          period: status === "LIVE" ? randomBetween(1, 3) : null,
        },
      });
      gameCount++;
    }
  }

  // Recompute standings from FINAL games.
  const finalGames = await prisma.game.findMany({
    where: { seasonId: season.id, status: "FINAL" },
  });

  const table = new Map<
    string,
    { wins: number; losses: number; otLosses: number; goalsFor: number; goalsAgainst: number; gamesPlayed: number }
  >();
  for (const team of teams) {
    table.set(team.id, { wins: 0, losses: 0, otLosses: 0, goalsFor: 0, goalsAgainst: 0, gamesPlayed: 0 });
  }

  for (const game of finalGames) {
    if (game.homeScore === null || game.awayScore === null) continue;
    const home = table.get(game.homeTeamId);
    const away = table.get(game.awayTeamId);
    if (!home || !away) continue;

    home.gamesPlayed++;
    away.gamesPlayed++;
    home.goalsFor += game.homeScore;
    home.goalsAgainst += game.awayScore;
    away.goalsFor += game.awayScore;
    away.goalsAgainst += game.homeScore;

    if (game.homeScore > game.awayScore) {
      home.wins++;
      away.losses++;
    } else {
      away.wins++;
      home.losses++;
    }
  }

  const ranked = teams
    .map((team) => ({ team, stats: table.get(team.id)! }))
    .sort((a, b) => (b.stats.wins * 2 - b.stats.losses) - (a.stats.wins * 2 - a.stats.losses));

  for (let i = 0; i < ranked.length; i++) {
    const entry = ranked[i];
    if (!entry) continue;
    const { team, stats } = entry;
    await prisma.standing.upsert({
      where: { seasonId_teamId: { seasonId: season.id, teamId: team.id } },
      update: {
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        otLosses: stats.otLosses,
        points: stats.wins * 2 + stats.otLosses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        rank: i + 1,
      },
      create: {
        seasonId: season.id,
        teamId: team.id,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        otLosses: stats.otLosses,
        points: stats.wins * 2 + stats.otLosses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        rank: i + 1,
      },
    });
  }

  const articles = [
    {
      slug: "azhl-2025-26-season-preview",
      title: "AZHL 2025-26 Season Preview: Six Teams, One Trophy",
      excerpt: "A look at the storylines shaping the league's newest campaign.",
      body: "The 2025-26 AZHL season opens with six teams chasing the league trophy. From the Ironhawks' veteran core to the Northern Lights' rebuild, every contender enters with a case to make.",
      coverImageUrl: null,
    },
    {
      slug: "glacier-open-season-strong",
      title: "Glacier Open Season on a Five-Game Run",
      excerpt: "Anchorage's top line is clicking early.",
      body: "The Glacier have opened the season in dominant form, riding a potent top line to an early lead in the standings.",
      coverImageUrl: null,
    },
    {
      slug: "league-announces-showcase-weekend",
      title: "League Announces Mid-Season Showcase Weekend",
      excerpt: "All six teams will feature in a nationally broadcast weekend of hockey.",
      body: "AZHL announced a mid-season showcase weekend, bringing all six franchises together for a nationally broadcast slate of games.",
      coverImageUrl: null,
    },
  ];

  for (const article of articles) {
    await prisma.newsArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }

  console.warn(`Seed complete: 1 league, 1 season, ${teams.length} teams, ${gameCount} games, ${articles.length} articles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
