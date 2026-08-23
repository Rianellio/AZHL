/** MOCK DATA — see ./README.md. No goalie-specific stat model exists yet (GAA/SV%/shutouts
 * aren't tracked anywhere in the schema), and no AZHL season has been played — always zero. */
export interface MockGoalieStatLine {
  wins: number;
  goalsAgainstAverage: number;
  savePercentage: number;
  shutouts: number;
}

const ZERO_GOALIE_LINE: MockGoalieStatLine = {
  wins: 0,
  goalsAgainstAverage: 0,
  savePercentage: 0,
  shutouts: 0,
};

export function getMockGoalieStats(): MockGoalieStatLine {
  return ZERO_GOALIE_LINE;
}
