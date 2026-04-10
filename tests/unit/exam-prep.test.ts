import { describe, it, expect } from "vitest";
import { calculateScore, formatDuration, getExamSubjects } from "@/lib/exam";

describe("exam prep helpers", () => {
  describe("calculateScore", () => {
    it("returns 0 when no answers are correct", () => {
      const answers = [1, 2, 3];
      const correct = [0, 0, 0];
      expect(calculateScore(answers, correct)).toEqual({ score: 0, total: 3, percentage: 0 });
    });

    it("returns 100% when all answers correct", () => {
      const answers = [0, 1, 2];
      const correct = [0, 1, 2];
      expect(calculateScore(answers, correct)).toEqual({ score: 3, total: 3, percentage: 100 });
    });

    it("calculates partial score correctly", () => {
      const answers = [0, 1, 2, 3];
      const correct = [0, 0, 2, 3];
      expect(calculateScore(answers, correct)).toEqual({ score: 3, total: 4, percentage: 75 });
    });

    it("handles empty arrays", () => {
      expect(calculateScore([], [])).toEqual({ score: 0, total: 0, percentage: 0 });
    });

    it("rounds percentage to nearest integer", () => {
      const answers = [0, 1, 0];
      const correct = [0, 0, 0];
      // 2 correct out of 3 = 66.67 → 67
      expect(calculateScore(answers, correct).percentage).toBe(67);
    });
  });

  describe("formatDuration", () => {
    it("formats seconds under a minute", () => {
      expect(formatDuration(45)).toBe("0:45");
    });

    it("formats exact minutes", () => {
      expect(formatDuration(120)).toBe("2:00");
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(185)).toBe("3:05");
    });

    it("pads seconds with leading zero", () => {
      expect(formatDuration(61)).toBe("1:01");
    });

    it("handles zero", () => {
      expect(formatDuration(0)).toBe("0:00");
    });
  });

  describe("getExamSubjects", () => {
    it("returns correct subjects for CEPE", () => {
      const subjects = getExamSubjects("CEPE");
      expect(subjects).toContain("francais");
      expect(subjects).toContain("mathematiques");
      expect(subjects).not.toContain("philosophie");
    });

    it("returns correct subjects for BEPC", () => {
      const subjects = getExamSubjects("BEPC");
      expect(subjects).toContain("anglais");
      expect(subjects).toContain("physique_chimie");
    });

    it("returns correct subjects for BAC", () => {
      const subjects = getExamSubjects("BAC");
      expect(subjects).toContain("philosophie");
      expect(subjects).toContain("mathematiques");
    });

    it("returns correct subjects for CONCOURS_6EME", () => {
      const subjects = getExamSubjects("CONCOURS_6EME");
      expect(subjects).toContain("francais");
      expect(subjects).toContain("mathematiques");
    });

    it("returns empty array for unknown exam", () => {
      expect(getExamSubjects("UNKNOWN")).toEqual([]);
    });
  });
});
