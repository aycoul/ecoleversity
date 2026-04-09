import { describe, it, expect } from "vitest";
import {
  USER_ROLES,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GRADE_GROUPS,
  TARGET_EXAMS,
  TARGET_EXAM_LABELS,
  SUBJECTS,
  SUBJECT_LABELS,
  SUBJECTS_BY_LEVEL,
  IVORIAN_CITIES,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_LABELS,
} from "@/types/domain";
import type { Database } from "@/types/database";

// Extract enum values from the generated Supabase types
type DbUserRole = Database["public"]["Enums"]["user_role"];
type DbGradeLevel = Database["public"]["Enums"]["grade_level"];
type DbTargetExam = Database["public"]["Enums"]["target_exam"];
type DbPaymentProvider = Database["public"]["Enums"]["payment_provider"];

describe("domain types", () => {
  describe("USER_ROLES", () => {
    it("has exactly 4 roles", () => {
      expect(USER_ROLES).toHaveLength(4);
    });

    it("includes parent, teacher, admin, school_admin", () => {
      expect(USER_ROLES).toContain("parent");
      expect(USER_ROLES).toContain("teacher");
      expect(USER_ROLES).toContain("admin");
      expect(USER_ROLES).toContain("school_admin");
    });

    it("matches database enum values", () => {
      // Type-level check: if domain type doesn't match DB enum, this won't compile
      const _typeCheck: DbUserRole[] = [...USER_ROLES];
      expect(_typeCheck).toEqual([...USER_ROLES]);
    });
  });

  describe("GRADE_LEVELS", () => {
    it("has 13 levels (CP1 through Terminale)", () => {
      expect(GRADE_LEVELS).toHaveLength(13);
    });

    it("starts with CP1 and ends with Terminale", () => {
      expect(GRADE_LEVELS[0]).toBe("CP1");
      expect(GRADE_LEVELS[GRADE_LEVELS.length - 1]).toBe("Terminale");
    });

    it("every grade level has a French label", () => {
      for (const level of GRADE_LEVELS) {
        expect(GRADE_LEVEL_LABELS[level]).toBeDefined();
        expect(GRADE_LEVEL_LABELS[level].length).toBeGreaterThan(0);
      }
    });

    it("matches database enum values", () => {
      const _typeCheck: DbGradeLevel[] = [...GRADE_LEVELS];
      expect(_typeCheck).toEqual([...GRADE_LEVELS]);
    });

    it("grade groups cover all levels", () => {
      const allGrouped = [
        ...GRADE_GROUPS.primaire,
        ...GRADE_GROUPS.college,
        ...GRADE_GROUPS.lycee,
      ];
      expect(allGrouped).toHaveLength(GRADE_LEVELS.length);
      for (const level of GRADE_LEVELS) {
        expect(allGrouped).toContain(level);
      }
    });
  });

  describe("TARGET_EXAMS", () => {
    it("has 4 exams", () => {
      expect(TARGET_EXAMS).toHaveLength(4);
    });

    it("every exam has a label", () => {
      for (const exam of TARGET_EXAMS) {
        expect(TARGET_EXAM_LABELS[exam]).toBeDefined();
      }
    });

    it("matches database enum values", () => {
      const _typeCheck: DbTargetExam[] = [...TARGET_EXAMS];
      expect(_typeCheck).toEqual([...TARGET_EXAMS]);
    });
  });

  describe("SUBJECTS", () => {
    it("has 17 subjects", () => {
      expect(SUBJECTS).toHaveLength(17);
    });

    it("every subject has a French label", () => {
      for (const subject of SUBJECTS) {
        expect(SUBJECT_LABELS[subject]).toBeDefined();
        expect(SUBJECT_LABELS[subject].length).toBeGreaterThan(0);
      }
    });

    it("subjects by level covers core subjects", () => {
      expect(SUBJECTS_BY_LEVEL.primaire.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.college.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.lycee.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.enrichment.length).toBeGreaterThan(0);
    });
  });

  describe("PAYMENT_PROVIDERS", () => {
    it("has 3 bootstrap providers", () => {
      expect(PAYMENT_PROVIDERS).toHaveLength(3);
    });

    it("includes Orange Money and Wave (primary CI providers)", () => {
      expect(PAYMENT_PROVIDERS).toContain("orange_money");
      expect(PAYMENT_PROVIDERS).toContain("wave");
    });

    it("every provider has a label", () => {
      for (const provider of PAYMENT_PROVIDERS) {
        expect(PAYMENT_PROVIDER_LABELS[provider]).toBeDefined();
      }
    });

    it("domain providers are a subset of database providers", () => {
      // DB has more providers (wallet, manual) — domain only exposes user-facing ones
      for (const provider of PAYMENT_PROVIDERS) {
        const _typeCheck: DbPaymentProvider = provider;
        expect(_typeCheck).toBe(provider);
      }
    });
  });

  describe("IVORIAN_CITIES", () => {
    it("has 10 major cities", () => {
      expect(IVORIAN_CITIES).toHaveLength(10);
    });

    it("starts with Abidjan (largest city)", () => {
      expect(IVORIAN_CITIES[0]).toBe("Abidjan");
    });

    it("includes Yamoussoukro (capital)", () => {
      expect(IVORIAN_CITIES).toContain("Yamoussoukro");
    });
  });
});
