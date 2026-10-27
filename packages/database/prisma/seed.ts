import { PrismaClient, type PlayerPosition } from "@prisma/client";
import { recomputeStandings } from "../src/standings";

const prisma = new PrismaClient();

const TEAM_SEED = [
  { name: "Qartal", city: "Baku", abbreviation: "QAR", colorPrimary: "#0A0A0B", colorSecondary: "#F5F5F5", colorAccent: "#C1121F" },
  { name: "Ulduz", city: "Baku", abbreviation: "ULD", colorPrimary: "#0F1B2E", colorSecondary: "#F5F5F5", colorAccent: "#2C4A8C" },
  { name: "Gala", city: "Baku", abbreviation: "GAL", colorPrimary: "#1A1508", colorSecondary: "#0A0A0B", colorAccent: "#C9A24B" },
  { name: "Buta", city: "Baku", abbreviation: "BUT", colorPrimary: "#0C1A10", colorSecondary: "#0A0A0B", colorAccent: "#1F7A4D" },
] as const;

// Тренеры и ваш персональный профиль с закрепленными номерами
const SPECIAL_PLAYERS = [
  { name: "Orkhan Muradov", jersey: 7, position: "C" as PlayerPosition, teamAbbr: "QAR" },
  { name: "Ismail Iusifli", jersey: 8, position: "C" as PlayerPosition, teamAbbr: "QAR" },
  { name: "Danil Anatolyevich", jersey: 22, position: "D" as PlayerPosition, teamAbbr: "ULD" },
  { name: "Aleksandr Sergeyevich", jersey: 17, position: "RW" as PlayerPosition, teamAbbr: "GAL" },
  { name: "Zaur Aliyev", jersey: 10, position: "C" as PlayerPosition, teamAbbr: "BUT" },
];

const ROSTER_SLOTS: PlayerPosition[] = [
  "G", "G",
  "D", "D", "D", "D", "D", "D",
  "C", "C", "C",
  "LW", "LW", "RW", "RW", "RW",
];

const FIRST_NAMES = [
  "Ali", "Elvin", "Ruslan", "Tural", "Kamran", "Rashad", "Farid",
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

const VENUE = "Heydar Aliyev Sports and Concert Complex";

const LEGACY_DEMO_ARTICLE_SLUGS = [
  "azhl-2025-26-season-preview",
  "glacier-open-season-strong",
  "league-announces-showcase-weekend",
];

const SEASON = { label: "2026-27", startDate: "2026-10-20", endDate: "2027-04-06" } as const;

const CALENDAR: readonly (readonly [number, string, string, string])[] = [
  [1, "2026-10-20", "QARTAL", "ULDUZ"],
  [2, "2026-10-22", "BUTA", "GALA"],
  [3, "2026-10-27", "QARTAL", "BUTA"],
  [4, "2026-10-29", "ULDUZ", "GALA"],
  [5, "2026-11-03", "GALA", "QARTAL"],
  [6, "2026-11-05", "ULDUZ", "BUTA"],
  [7, "2026-11-10", "ULDUZ", "QARTAL"],
  [8, "2026-11-12", "BUTA", "GALA"],
  [9, "2026-11-17", "BUTA", "QARTAL"],
  [10, "2026-11-19", "GALA", "ULDUZ"],
  [11, "2026-11-24", "QARTAL", "GALA"],
  [12, "2026-11-26", "BUTA", "ULDUZ"],
  [13, "2026-12-01", "QARTAL", "ULDUZ"],
  [14, "2026-12-03", "GALA", "BUTA"],
  [15, "2026-12-08", "QARTAL", "BUTA"],
  [16, "2026-12-10", "ULDUZ", "GALA"],
  [17, "2026-12-15", "GALA", "QARTAL"],
  [18, "2026-12-17", "ULDUZ", "BUTA"],
  [19, "2027-01-19", "ULDUZ", "QARTAL"],
  [20, "2027-01-21", "BUTA", "GALA"],
  [21, "2027-01-26", "BUTA", "QARTAL"],
  [22, "2027-01-28", "GALA", "ULDUZ"],
  [23, "2027-02-02", "QARTAL", "GALA"],
  [24, "2027-02-04", "BUTA", "ULDUZ"],
  [25, "2027-02-09", "QARTAL", "ULDUZ"],
  [26, "2027-02-11", "GALA", "BUTA"],
  [27, "2027-02-16", "QARTAL", "BUTA"],
  [28, "2027-02-18", "ULDUZ", "GALA"],
  [29, "2027-02-23", "GALA", "QARTAL"],
  [30, "2027-02-25", "ULDUZ", "BUTA"],
];

const GAMES_PER_TEAM = 15;

function dateAtNoonUtc(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
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

  const seasonStart = new Date(`${SEASON.startDate}T00:00:00Z`);
  const seasonEnd = new Date(`${SEASON.endDate}T00:00:00Z`);
  const seasonLabel = SEASON.label;

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

  // ВАЖНО: Очищаем старых игроков, чтобы новые составы записались начисто
  await prisma.player.deleteMany({});

  const teams = [];
  for (const [teamIndex, teamData] of TEAM_SEED.entries()) {
    const team = await prisma.team.upsert({
      where: { abbreviation: teamData.abbreviation },
      update: { ...teamData },
      create: {
        ...teamData,
        slug: slugify(teamData.name),
      },
    });
    teams.push(team);

    // 1. Создаем закрепленных игроков команды (тренеры + вы)
    const teamSpecial = SPECIAL_PLAYERS.filter((p) => p.teamAbbr === team.abbreviation);
    const usedNumbers = new Set<number>();

    for (const sp of teamSpecial) {
      usedNumbers.add(sp.jersey);
      await prisma.player.create({
        data: {
          teamId: team.id,
          fullName: sp.name,
          jerseyNumber: sp.jersey,
          position: sp.position,
        },
      });
    }

    // 2. Дозаполняем состав до 16 игроков
    const slotsNeeded = ROSTER_SLOTS.length - teamSpecial.length;

    for (let slot = 0; slot < slotsNeeded; slot++) {
      const position = ROSTER_SLOTS[slot]!;
      let jerseyNumber = ((teamIndex * 37 + (slot + 1) * 13) % 97) + 2;
      while (usedNumbers.has(jerseyNumber)) {
        jerseyNumber = ((jerseyNumber - 1) % 97) + 2;
      }
      usedNumbers.add(jerseyNumber);

      await prisma.player.create({
        data: {
          teamId: team.id,
          fullName: playerName(teamIndex * 20 + slot + 3),
          jerseyNumber,
          position,
        },
      });
    }
  }

  const teamByName = new Map(teams.map((team) => [team.name.toUpperCase(), team]));
  const gamesPerTeam = new Map<string, number>();
  for (const [matchNumber, date, homeName, awayName] of CALENDAR) {
    const home = teamByName.get(homeName);
    const away = teamByName.get(awayName);
    if (!home || !away) throw new Error(`Calendar match ${matchNumber}: unknown team ${homeName} or ${awayName}.`);
    gamesPerTeam.set(home.id, (gamesPerTeam.get(home.id) ?? 0) + 1);
    gamesPerTeam.set(away.id, (gamesPerTeam.get(away.id) ?? 0) + 1);

    const fixture = {
      startTime: dateAtNoonUtc(date),
      startTimeConfirmed: false,
      venue: VENUE,
      homeTeamId: home.id,
      awayTeamId: away.id,
    };
    const where = { seasonId_stage_matchNumber: { seasonId: season.id, stage: "REGULAR_SEASON" as const, matchNumber } };
    const current = await prisma.game.findUnique({ where, select: { startTimeConfirmed: true } });
    if (!current) {
      await prisma.game.create({
        data: { ...fixture, seasonId: season.id, stage: "REGULAR_SEASON", matchNumber, status: "SCHEDULED" },
      });
    } else {
      const { startTime, startTimeConfirmed, ...rest } = fixture;
      await prisma.game.update({
        where,
        data: current.startTimeConfirmed ? rest : { ...rest, startTime, startTimeConfirmed },
      });
    }
  }

  for (const team of teams) {
    if (gamesPerTeam.get(team.id) !== GAMES_PER_TEAM) {
      throw new Error(`${team.name} has ${gamesPerTeam.get(team.id) ?? 0} calendar games, expected ${GAMES_PER_TEAM}.`);
    }
  }

  await prisma.game.deleteMany({
    where: { seasonId: season.id, stage: "REGULAR_SEASON", OR: [{ matchNumber: null }, { matchNumber: { gt: CALENDAR.length } }] },
  });
  const gameCount = CALENDAR.length;

  await recomputeStandings(season.id, prisma);
  await prisma.newsArticle.deleteMany({ where: { slug: { in: LEGACY_DEMO_ARTICLE_SLUGS } } });

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