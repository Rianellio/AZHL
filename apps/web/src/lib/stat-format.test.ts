import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatGoalsAgainstAverage,
  formatSavePercentage,
} from "./stat-format";

describe("stat-format", () => {
  describe("formatCount", () => {
    it("returns an em dash when games played is 0", () => {
      expect(formatCount(0, 0)).toBe("—");
      expect(formatCount(10, 0)).toBe("—");
    });

    it("formats counting stats as string when games played > 0", () => {
      expect(formatCount(5, 1)).toBe("5");
      expect(formatCount(0, 1)).toBe("0");
    });
  });

  describe("formatGoalsAgainstAverage", () => {
    it("returns an em dash when games played is 0", () => {
      expect(formatGoalsAgainstAverage(2.45, 0)).toBe("—");
    });

    it("formats GAA with 2 decimal places when games played > 0", () => {
      expect(formatGoalsAgainstAverage(2, 3)).toBe("2.00");
      expect(formatGoalsAgainstAverage(2.456, 3)).toBe("2.46");
      expect(formatGoalsAgainstAverage(0, 1)).toBe("0.00");
    });
  });

  describe("formatSavePercentage", () => {
    it("returns an em dash when games played is 0", () => {
      expect(formatSavePercentage(0.925, 0)).toBe("—");
    });

    it("strips the leading zero for values between 0 and 1", () => {
      expect(formatSavePercentage(0.915, 2)).toBe(".915");
      expect(formatSavePercentage(0.9, 2)).toBe(".900");
    });

    it("keeps leading 1 for a perfect 1.000 save percentage", () => {
      expect(formatSavePercentage(1.0, 1)).toBe("1.000");
    });
  });
});