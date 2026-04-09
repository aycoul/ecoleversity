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
  LYCEE_SERIES,
  LYCEE_SERIE_LABELS,
  BAC_COEFFICIENTS,
  EXAM_CATEGORIES,
  EXAMS_BY_CATEGORY,
  TUTORING_CATEGORIES,
  TUTORING_CATEGORY_LABELS,
  getHighStakesSubjects,
  getGradeGroup,
  getSubjectsForStudent,
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
      const _typeCheck: DbUserRole[] = [...USER_ROLES];
      expect(_typeCheck).toEqual([...USER_ROLES]);
    });
  });

  describe("GRADE_LEVELS", () => {
    it("has 16 levels (PS through Terminale)", () => {
      expect(GRADE_LEVELS).toHaveLength(16);
    });

    it("starts with PS (préscolaire) and ends with Terminale", () => {
      expect(GRADE_LEVELS[0]).toBe("PS");
      expect(GRADE_LEVELS[GRADE_LEVELS.length - 1]).toBe("Terminale");
    });

    it("includes maternelle levels", () => {
      expect(GRADE_LEVELS).toContain("PS");
      expect(GRADE_LEVELS).toContain("MS");
      expect(GRADE_LEVELS).toContain("GS");
    });

    it("every grade level has a French label", () => {
      for (const level of GRADE_LEVELS) {
        expect(GRADE_LEVEL_LABELS[level]).toBeDefined();
        expect(GRADE_LEVEL_LABELS[level].length).toBeGreaterThan(0);
      }
    });

    it("grade groups cover all levels", () => {
      const allGrouped = [
        ...GRADE_GROUPS.prescolaire,
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

  describe("LYCEE_SERIES", () => {
    it("has 12 séries (4 général + 8 technique)", () => {
      expect(LYCEE_SERIES).toHaveLength(12);
    });

    it("includes all général séries (A1, A2, C, D)", () => {
      expect(LYCEE_SERIES).toContain("A1");
      expect(LYCEE_SERIES).toContain("A2");
      expect(LYCEE_SERIES).toContain("C");
      expect(LYCEE_SERIES).toContain("D");
    });

    it("includes all technique séries (E, F1-F4, G1-G2, H)", () => {
      expect(LYCEE_SERIES).toContain("E");
      expect(LYCEE_SERIES).toContain("F1");
      expect(LYCEE_SERIES).toContain("F2");
      expect(LYCEE_SERIES).toContain("F3");
      expect(LYCEE_SERIES).toContain("F4");
      expect(LYCEE_SERIES).toContain("G1");
      expect(LYCEE_SERIES).toContain("G2");
      expect(LYCEE_SERIES).toContain("H");
    });

    it("every série has a label", () => {
      for (const serie of LYCEE_SERIES) {
        expect(LYCEE_SERIE_LABELS[serie]).toBeDefined();
        expect(LYCEE_SERIE_LABELS[serie].length).toBeGreaterThan(0);
      }
    });

    it("every série has BAC coefficients", () => {
      for (const serie of LYCEE_SERIES) {
        const coeffs = BAC_COEFFICIENTS[serie];
        expect(Object.keys(coeffs).length).toBeGreaterThan(0);
      }
    });
  });

  describe("TARGET_EXAMS", () => {
    it("has national CI exams", () => {
      expect(TARGET_EXAMS).toContain("CEPE");
      expect(TARGET_EXAMS).toContain("BEPC");
      expect(TARGET_EXAMS).toContain("BAC");
      expect(TARGET_EXAMS).toContain("BAC_GENERAL");
      expect(TARGET_EXAMS).toContain("BAC_TECHNIQUE");
      expect(TARGET_EXAMS).toContain("CONCOURS_6EME");
    });

    it("has international exams", () => {
      expect(TARGET_EXAMS).toContain("IB_DIPLOMA");
      expect(TARGET_EXAMS).toContain("SAT");
      expect(TARGET_EXAMS).toContain("IELTS");
      expect(TARGET_EXAMS).toContain("TOEFL");
    });

    it("has university admission exams", () => {
      expect(TARGET_EXAMS).toContain("CONCOURS_GRANDES_ECOLES");
      expect(TARGET_EXAMS).toContain("CONCOURS_INPHB");
    });

    it("every exam has a label", () => {
      for (const exam of TARGET_EXAMS) {
        expect(TARGET_EXAM_LABELS[exam]).toBeDefined();
      }
    });

    it("exam categories cover all exams", () => {
      const allCategorized = Object.values(EXAMS_BY_CATEGORY).flat();
      for (const exam of TARGET_EXAMS) {
        expect(allCategorized).toContain(exam);
      }
    });
  });

  describe("SUBJECTS", () => {
    it("has more than 30 subjects (core + technical + languages + enrichment)", () => {
      expect(SUBJECTS.length).toBeGreaterThan(30);
    });

    it("every subject has a French label", () => {
      for (const subject of SUBJECTS) {
        expect(SUBJECT_LABELS[subject]).toBeDefined();
        expect(SUBJECT_LABELS[subject].length).toBeGreaterThan(0);
      }
    });

    it("includes technical lycée subjects", () => {
      expect(SUBJECTS).toContain("dessin_technique");
      expect(SUBJECTS).toContain("electronique");
      expect(SUBJECTS).toContain("comptabilite");
      expect(SUBJECTS).toContain("informatique");
    });

    it("includes international languages", () => {
      expect(SUBJECTS).toContain("chinois");
      expect(SUBJECTS).toContain("espagnol");
      expect(SUBJECTS).toContain("allemand");
    });

    it("includes préscolaire subjects", () => {
      expect(SUBJECTS).toContain("eveil");
      expect(SUBJECTS).toContain("graphisme");
      expect(SUBJECTS).toContain("langage");
    });

    it("subjects by level covers all grade groups", () => {
      expect(SUBJECTS_BY_LEVEL.prescolaire.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.primaire.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.college.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.lycee.length).toBeGreaterThan(0);
      expect(SUBJECTS_BY_LEVEL.enrichment.length).toBeGreaterThan(0);
    });
  });

  describe("TUTORING_CATEGORIES", () => {
    it("has demand-driven categories beyond curriculum", () => {
      expect(TUTORING_CATEGORIES).toContain("curriculum");
      expect(TUTORING_CATEGORIES).toContain("exam_prep");
      expect(TUTORING_CATEGORIES).toContain("study_abroad");
      expect(TUTORING_CATEGORIES).toContain("language_learning");
      expect(TUTORING_CATEGORIES).toContain("homework_help");
    });

    it("every category has a label", () => {
      for (const cat of TUTORING_CATEGORIES) {
        expect(TUTORING_CATEGORY_LABELS[cat]).toBeDefined();
      }
    });
  });

  describe("PAYMENT_PROVIDERS", () => {
    it("has 4 providers (3 mobile + Flutterwave)", () => {
      expect(PAYMENT_PROVIDERS).toHaveLength(4);
    });

    it("includes Orange Money, Wave, and Flutterwave", () => {
      expect(PAYMENT_PROVIDERS).toContain("orange_money");
      expect(PAYMENT_PROVIDERS).toContain("wave");
      expect(PAYMENT_PROVIDERS).toContain("flutterwave");
    });

    it("every provider has a label", () => {
      for (const provider of PAYMENT_PROVIDERS) {
        expect(PAYMENT_PROVIDER_LABELS[provider]).toBeDefined();
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

  describe("helper functions", () => {
    it("getHighStakesSubjects returns sorted by coefficient", () => {
      const serieC = getHighStakesSubjects("C");
      expect(serieC[0].subject).toBe("mathematiques");
      expect(serieC[0].coefficient).toBe(5);
      expect(serieC[1].subject).toBe("physique_chimie");
      expect(serieC[1].coefficient).toBe(4);
    });

    it("getGradeGroup maps grades correctly", () => {
      expect(getGradeGroup("PS")).toBe("prescolaire");
      expect(getGradeGroup("CP1")).toBe("primaire");
      expect(getGradeGroup("6eme")).toBe("college");
      expect(getGradeGroup("Terminale")).toBe("lycee");
    });

    it("getSubjectsForStudent returns série-specific subjects for lycée", () => {
      const subjects = getSubjectsForStudent("Terminale", "G2");
      expect(subjects).toContain("comptabilite");
      expect(subjects).toContain("maths_financieres");
      expect(subjects).toContain("philosophie"); // from common
    });

    it("getSubjectsForStudent returns level subjects without série", () => {
      const subjects = getSubjectsForStudent("CE1");
      expect(subjects).toContain("francais");
      expect(subjects).toContain("mathematiques");
      expect(subjects).not.toContain("philosophie");
    });
  });
});
