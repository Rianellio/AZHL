import { describe, expect, it } from "vitest";
import {
  computeStandings,
  FORFEIT_SCORE,
  POINTS,
  SHOOTOUT_WINNER_GOAL_BONUS,
  type StandingsGame,
} from "./standings";

let gameSeq = 0;
/** One game; scores are the official final score (a shootout winner's +1 already included). */
function game(home: string, away: string, homeScore: number, awayScore: number, shootout = false): StandingsGame {
  return {
    id: `g${++gameSeq}`,
    homeTeamId: home,
    awayTeamId: away,
    homeScore,
    awayScore,
    decidedBy: shootout ? "SHOOTOUT" : "REGULATION",
  };
}

function rankOrder(teamIds: string[], games: StandingsGame[], teamNames?: Map<string, string>): string[] {
  return computeStandings(teamIds, games, teamNames).map((s) => s.teamId);
}

function byTeam(teamIds: string[], games: StandingsGame[]) {
  return Object.fromEntries(computeStandings(teamIds, games).map((s) => [s.teamId, s]));
}

const TEAMS = ["A", "B", "C", "D"];

describe("points", () => {
  const table = byTeam(TEAMS, [game("A", "B", 3, 1), game("C", "D", 3, 2, true)]);

  it.each([
    { result: "regulation win", team: "A", points: POINTS.REGULATION_WIN, field: "wins" },
    { result: "regulation loss", team: "B", points: POINTS.REGULATION_LOSS, field: "losses" },
    { result: "shootout win", team: "C", points: POINTS.SHOOTOUT_WIN, field: "shootoutWins" },
    { result: "shootout loss", team: "D", points: POINTS.SHOOTOUT_LOSS, field: "shootoutLosses" },
  ] as const)("$result gives $points pts and counts as $field", ({ team, points, field }) => {
    expect(table[team]!.points).toBe(points);
    expect(table[team]![field]).toBe(1);
  });

  it("uses the regulation's point values", () => {
    expect(POINTS).toEqual({ REGULATION_WIN: 2, SHOOTOUT_WIN: 2, SHOOTOUT_LOSS: 1, REGULATION_LOSS: 0 });
  });

  it("counts the shootout winner's +1 goal in goals for/against", () => {
    expect(SHOOTOUT_WINNER_GOAL_BONUS).toBe(1);
    expect(table.C!.goalsFor).toBe(3);
    expect(table.D!.goalsAgainst).toBe(3);
  });

  it("keeps GP = W + SOW + SOL + L", () => {
    const standings = computeStandings(TEAMS, [game("A", "B", 3, 2, true), game("A", "C", 1, 0), game("D", "A", 2, 0)]);
    for (const s of standings) {
      expect(s.gamesPlayed).toBe(s.wins + s.shootoutWins + s.shootoutLosses + s.losses);
    }
  });
});

describe("ranking and tiebreakers", () => {
  it.each([
    {
      criterion: "1. points",
      teams: TEAMS,
      games: [game("B", "A", 2, 0), game("C", "D", 2, 1, true)],
      expected: ["B", "C", "D", "A"],
    },
    {
      // A and B both 4 pts; B won their meeting -> B first despite A's far better overall goal difference.
      criterion: "2. head-to-head points",
      teams: TEAMS,
      games: [game("A", "C", 9, 0), game("A", "D", 9, 0), game("B", "A", 1, 0), game("B", "C", 1, 0), game("C", "D", 1, 0)],
      expected: ["B", "A", "C", "D"],
    },
    {
      // A and B level on points and split their two meetings, but B won its meeting by more.
      criterion: "3. head-to-head goal difference",
      teams: TEAMS,
      games: [
        game("A", "B", 1, 0),
        game("B", "A", 4, 0),
        game("A", "C", 9, 0),
        game("A", "D", 9, 0),
        game("B", "C", 1, 0),
        game("B", "D", 1, 0),
      ],
      expected: ["B", "A", "C", "D"],
    },
    {
      // Head-to-head fully level (2:1 each way); A's win over C was bigger.
      criterion: "4. overall goal difference",
      teams: ["A", "B", "C"],
      games: [game("A", "B", 2, 1), game("B", "A", 2, 1), game("A", "C", 5, 0), game("B", "C", 2, 0)],
      expected: ["A", "B", "C"],
    },
    {
      // Same goal difference everywhere; A scored more.
      criterion: "5. goals scored",
      teams: ["A", "B", "C"],
      games: [game("A", "B", 2, 1), game("B", "A", 2, 1), game("A", "C", 5, 4), game("B", "C", 2, 1)],
      expected: ["A", "B", "C"],
    },
    {
      // X: one regulation win + one regulation loss. Y: two shootout losses. Both 2 pts, GF 3, GA 5,
      // never met (head-to-head level at zero) -> X ranks higher on number of wins. P and Q finish on
      // 4 pts so they stay out of the X/Y tie.
      criterion: "6. number of wins (regulation + shootout)",
      teams: ["Y", "X", "Q", "P"],
      games: [
        game("X", "P", 3, 2),
        game("X", "Q", 0, 3),
        game("Y", "P", 1, 2, true),
        game("Y", "Q", 2, 3, true),
        game("P", "Q", 1, 0),
      ],
      expected: ["P", "Q", "X", "Y"],
    },
  ])("$criterion", ({ teams, games, expected }) => {
    expect(rankOrder(teams, games)).toEqual(expected);
  });

  it("7. lottery fallback: everything level -> stable alphabetical order by team name", () => {
    const names = new Map([
      ["a", "Zeta"],
      ["b", "Alpha"],
    ]);
    expect(rankOrder(["a", "b"], [], names)).toEqual(["b", "a"]);
    expect(rankOrder(["b", "a"], [], names)).toEqual(["b", "a"]);
  });

  it("restarts head-to-head for the teams still tied after a 3-way split", () => {
    // A, B, C all on 4 pts. The 3-way mini-table puts A first (4 pts vs 2 + 2). Restarting with
    // only B and C's games (3:1, 0:1) gives B the better head-to-head goal difference, even though
    // the 3-way mini-table goal difference favours C (-2 vs -4).
    const games = [
      game("A", "B", 5, 0),
      game("A", "C", 1, 0),
      game("B", "C", 3, 1),
      game("C", "B", 1, 0),
      game("B", "D", 1, 0),
      game("C", "D", 1, 0),
    ];
    expect(rankOrder(TEAMS, games)).toEqual(["A", "B", "C", "D"]);
  });

  it("assigns ranks 1..n in order", () => {
    expect(computeStandings(TEAMS, []).map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe("forfeit", () => {
  it("a 0:3 technical result counts as a regulation result, goals included", () => {
    const [winner, loser] = computeStandings(["A", "B"], [game("A", "B", FORFEIT_SCORE.loser, FORFEIT_SCORE.winner)]);
    expect(FORFEIT_SCORE).toEqual({ winner: 3, loser: 0 });
    expect(winner).toMatchObject({ teamId: "B", wins: 1, points: POINTS.REGULATION_WIN, goalsFor: 3, goalsAgainst: 0 });
    expect(loser).toMatchObject({ teamId: "A", losses: 1, points: POINTS.REGULATION_LOSS, goalsFor: 0, goalsAgainst: 3 });
  });
});

describe("invalid results", () => {
  it.each([
    { result: "shootout won by 2 goals", g: () => game("A", "B", 4, 2, true) },
    { result: "tied shootout", g: () => game("A", "B", 2, 2, true) },
    { result: "tied regulation game", g: () => game("A", "B", 2, 2) },
  ])("rejects a $result", ({ g }) => {
    expect(() => computeStandings(["A", "B"], [g()])).toThrow();
  });
});
