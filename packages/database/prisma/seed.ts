import { PrismaClient, type PlayerPosition } from "@prisma/client";

const prisma = new PrismaClient();

// Azerbaijan Hockey League — the 4 approved club identities, matched to the official crest
// assets in apps/web/public/logos/ (see also lib/team-logos.ts). Exactly 4 — do not add more
// without a matching official logo. Name spelling follows each provided crest exactly
// ("Gala," not "Qala" — the crest itself reads GALA).
const TEAM_SEED = [
  { name: "Qartal", city: "Baku", abbreviation: "QAR", colorPrimary: "#0A0A0B", colorSecondary: "#F5F5F5", colorAccent: "#C1121F" },
  { name: "Ulduz", city: "Baku", abbreviation: "ULD", colorPrimary: "#0F1B2E", colorSecondary: "#F5F5F5", colorAccent: "#2C4A8C" },
  { name: "Gala", city: "Shaki", abbreviation: "GAL", colorPrimary: "#1A1508", colorSecondary: "#0A0A0B", colorAccent: "#C9A24B" },
  { name: "Buta", city: "Ganja", abbreviation: "BUT", colorPrimary: "#0C1A10", colorSecondary: "#0A0A0B", colorAccent: "#1F7A4D" },
] as const;

const POSITIONS: PlayerPosition[] = ["C", "LW", "RW", "D", "D", "G"];

// Deterministic Azerbaijani name pool — combined by index so re-running the seed produces
// the same roster every time (no Math.random() in identity data, only in game outcomes).
const FIRST_NAMES = [
  "Ali", "Elvin", "Ruslan", "Tural", "Kamran", "Rashad", "Farid", "Orkhan",
  "Anar", "Elnur", "Vusal", "Emin", "Nihat", "Samir", "Elshan", "Murad",
  "Nicat", "Tofig", "Ilkin", "Aykhan", "Vugar", "Fuad", "Ceyhun", "Namig",
] as const;

const LAST_NAMES = [
  "Muradov", "Zamanov", "Hasanov", "Ibrahimov", "Quliyev", "Mammadov", "Aliyev", "Huseynov",
  "Ismayilov", "Karimov", "Rzayev", "Abbasov", "Nagiyev", "Suleymanov", "Ahmadov", "Jafarov",
  "Guliyev", "Talibov", "Orujov", "Bagirov", "Hajiyev", "Aghayev", "Novruzov", "Sadigov",
] as const;

const AZ_TRANSLITERATION: Record<string, string> = {
  ə: "e", ç: "c", ş: "s", ğ: "g", ı: "i", ö: "o", ü: "u",
};

/** ASCII-safe slug for route params — team display names keep proper Azerbaijani diacritics. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[əçşğıöü]/g, (char) => AZ_TRANSLITERATION[char] ?? char)
    .replace(/\s+/g, "-");
}

function playerName(seed: number): string {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length]!;
  const last = LAST_NAMES[(seed * 7 + 3) % LAST_NAMES.length]!;
  return `${first} ${last}`;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.warn("Seeding AZHL database...");

  const league = await prisma.league.upsert({
    where: { slug: "azhl" },
    update: { name: "Azerbaijan Hockey League", shortName: "AZHL" },
    create: {
      name: "Azerbaijan Hockey League",
      shortName: "AZHL",
      slug: "azhl",
    },
  });

  // AZHL hasn't played a season yet — anchored relative to "now" so the seed always produces
  // an entirely upcoming schedule (no FINAL or LIVE games, no fabricated results) regardless
  // of when it's run.
  const now = new Date();
  const seasonStart = new Date(now);
  seasonStart.setDate(seasonStart.getDate() + 14);
  const seasonEnd = new Date(seasonStart);
  seasonEnd.setDate(seasonEnd.getDate() + 180);
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
  let playerSeed = 0;
  for (const teamData of TEAM_SEED) {
    const team = await prisma.team.upsert({
      where: { abbreviation: teamData.abbreviation },
      update: { ...teamData },
      create: {
        ...teamData,
        slug: slugify(teamData.name),
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
          fullName: playerName(playerSeed++),
          jerseyNumber,
          position: POSITIONS[i] ?? "C",
        },
      });
    }
  }

  // No real AZHL fixture schedule exists yet — the league hasn't announced game dates, venues,
  // or matchups. A previous pass here auto-generated a full synthetic round-robin (invented
  // dates, "{city} Ice Arena" venue names never confirmed real). That was presentation-layer
  // fake data masquerading as a real schedule, so it's gone: the Game table stays empty until
  // real fixtures are entered, and every schedule/game-center page already renders a clean
  // empty state for zero games with no further code change needed.
  await prisma.game.deleteMany({ where: { seasonId: season.id } });
  const gameCount = 0;

  // No FINAL games exist yet, so every team's standing resolves to zero across the board —
  // this loop is left in place (rather than hand-writing zero rows) so the day AZHL plays its
  // first game, standings start computing correctly with no code change needed.
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

  // No real AZHL news content exists yet — the previous seed here invented five demo articles
  // (a fake interview, a fake signing, even a fake club "Şimşək" that isn't in TEAM_SEED).
  // Fabricated presentation content, not real infrastructure — removed. Any of those articles
  // left over from a prior seed run are cleared explicitly since upsert-by-slug alone wouldn't
  // delete rows no longer in this script. The News table stays empty until real articles are
  // entered through the backend/CMS; the news pages already render a clean empty state.
  await prisma.newsArticle.deleteMany({});

  console.warn(`Seed complete: 1 league, 1 season, ${teams.length} teams, ${gameCount} games, 0 articles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
