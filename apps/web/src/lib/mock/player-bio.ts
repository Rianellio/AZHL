/** MOCK DATA — see ./README.md. No bio fields on Player yet. Achievements and career-season
 * history are deliberately always empty: AZHL hasn't played a season yet, so there is no
 * prior-season or awards history to show, real or placeholder. */
import { seedHash, seededInt } from "./seed-hash";
import type { MockPlayerStatLine } from "./player-stats";

export interface MockCareerSeason {
  season: string;
  team: string;
  stats: MockPlayerStatLine;
}

export interface MockAchievement {
  label: string;
}

export interface MockPlayerBio {
  age: number;
  heightCm: number;
  weightKg: number;
  hometown: string;
  bio: string;
  achievements: MockAchievement[];
  careerSeasons: MockCareerSeason[];
}

const HOMETOWNS = ["Baku", "Ganja", "Sumgayit", "Mingachevir", "Shaki", "Lankaran", "Nakhchivan"];

export function getMockPlayerBio(playerId: string, teamName: string): MockPlayerBio {
  const seed = seedHash(playerId);

  return {
    age: seededInt(seed + 2, 19, 34),
    heightCm: seededInt(seed + 3, 175, 195),
    weightKg: seededInt(seed + 4, 78, 98),
    hometown: HOMETOWNS[seededInt(seed + 5, 0, HOMETOWNS.length - 1)] ?? "Baku",
    bio: `A product of the Azerbaijani hockey development pipeline, ${teamName}'s newest addition ahead of the club's first AZHL season.`,
    achievements: [],
    careerSeasons: [],
  };
}
