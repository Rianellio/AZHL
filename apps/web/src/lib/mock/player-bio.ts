import type { PlayerSummaryDTO } from "@azhl/types";
import { seededInt, seedHash } from "./seed-hash";

export interface MockPlayerBio {
  age: number;
  birthDate: string; // Format: DD.MM.YYYY
  birthYear: number;
  heightCm: number;
  weightKg: number;
  shoots: "L" | "R"; // Stick Grip: L (left) / R (right)
  citizenship: string;
  citizenshipCode: string;
  category: "junior" | "adult" | "veteran";
}

export function getMockPlayerBio(player: Pick<PlayerSummaryDTO, "id" | "position">): MockPlayerBio {
  const seed = seedHash(`bio:${player.id}`);

  // 2026/27 season: ages 14 to 60
  const currentYear = 2026;
  const age = seededInt(seed, 14, 60);
  const birthYear = currentYear - age;
  const birthMonth = seededInt(seed + 1, 1, 12);
  const birthDay = seededInt(seed + 2, 1, 28);
  const formattedBirthDate = `${String(birthDay).padStart(2, "0")}.${String(birthMonth).padStart(2, "0")}.${birthYear}`;

  // Size gradation depending on age and position
  const isGoalieOrDefense = player.position === "D" || player.position === "G";
  let heightCm: number;
  let weightKg: number;
  let category: MockPlayerBio["category"];

  if (age < 18) {
    category = "junior";
    // Juniors (14-17 years old): height 165-184 cm, weight 58-76 kg
    heightCm = seededInt(seed + 3, 165, 184);
    weightKg = seededInt(seed + 4, 58, 76);
  } else if (age >= 45) {
    category = "veteran";
    // Veterans (45-60 years old): solid build
    heightCm = isGoalieOrDefense ? seededInt(seed + 3, 178, 192) : seededInt(seed + 3, 172, 186);
    weightKg = seededInt(seed + 4, 80, 102);
  } else {
    category = "adult";
    // The main age (18-44 years)
    heightCm = isGoalieOrDefense ? seededInt(seed + 3, 182, 198) : seededInt(seed + 3, 175, 190);
    weightKg = isGoalieOrDefense ? seededInt(seed + 4, 82, 100) : seededInt(seed + 4, 75, 92);
  }

  // Stick grip: Traditionally ~65% of hockey is played with a left grip
  const shoots: "L" | "R" = seededInt(seed + 5, 1, 100) <= 65 ? "L" : "R";

  return {
    age,
    birthDate: formattedBirthDate,
    birthYear,
    heightCm,
    weightKg,
    shoots,
    citizenship: "Azərbaycan",
    citizenshipCode: "AZE",
    category,
  };
}