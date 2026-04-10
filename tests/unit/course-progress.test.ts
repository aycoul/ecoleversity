import { describe, it, expect } from "vitest";

describe("course progress logic", () => {
  describe("progress percentage calculation", () => {
    it("calculates 0% when no lessons completed", () => {
      const totalLessons = 10;
      const completedLessons = 0;
      const progressPct = Math.round((completedLessons / totalLessons) * 100);
      expect(progressPct).toBe(0);
    });

    it("calculates 50% when half completed", () => {
      const totalLessons = 10;
      const completedLessons = 5;
      const progressPct = Math.round((completedLessons / totalLessons) * 100);
      expect(progressPct).toBe(50);
    });

    it("calculates 100% when all completed", () => {
      const totalLessons = 8;
      const completedLessons = 8;
      const progressPct = Math.round((completedLessons / totalLessons) * 100);
      expect(progressPct).toBe(100);
    });

    it("rounds to nearest integer", () => {
      const totalLessons = 3;
      const completedLessons = 1;
      const progressPct = Math.round((completedLessons / totalLessons) * 100);
      expect(progressPct).toBe(33);
    });

    it("handles single lesson course", () => {
      const totalLessons = 1;
      const completedLessons = 1;
      const progressPct = Math.round((completedLessons / totalLessons) * 100);
      expect(progressPct).toBe(100);
    });
  });

  describe("auto-complete threshold", () => {
    const AUTO_COMPLETE_THRESHOLD = 0.9; // 90% of video watched

    it("marks complete when 90% watched", () => {
      const duration = 600; // 10 minutes
      const watchPosition = 540; // 9 minutes
      const isComplete = watchPosition / duration >= AUTO_COMPLETE_THRESHOLD;
      expect(isComplete).toBe(true);
    });

    it("does not complete at 80%", () => {
      const duration = 600;
      const watchPosition = 480;
      const isComplete = watchPosition / duration >= AUTO_COMPLETE_THRESHOLD;
      expect(isComplete).toBe(false);
    });

    it("completes at exactly 90%", () => {
      const duration = 100;
      const watchPosition = 90;
      const isComplete = watchPosition / duration >= AUTO_COMPLETE_THRESHOLD;
      expect(isComplete).toBe(true);
    });
  });

  describe("group class capacity", () => {
    it("has spots available when under max", () => {
      const maxStudents = 10;
      const currentEnrollments = 7;
      const spotsLeft = maxStudents - currentEnrollments;
      expect(spotsLeft).toBe(3);
      expect(spotsLeft > 0).toBe(true);
    });

    it("is full when at max", () => {
      const maxStudents = 10;
      const currentEnrollments = 10;
      const spotsLeft = maxStudents - currentEnrollments;
      expect(spotsLeft).toBe(0);
    });

    it("calculates fill percentage for spots bar", () => {
      const maxStudents = 15;
      const currentEnrollments = 12;
      const fillPct = Math.round((currentEnrollments / maxStudents) * 100);
      expect(fillPct).toBe(80);
    });
  });
});
