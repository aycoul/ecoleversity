// ─── USER ROLES ───
export const USER_ROLES = ["parent", "teacher", "admin", "school_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ─── GRADE LEVELS (Full CI education system) ───
export const GRADE_LEVELS = [
  // Préscolaire (Maternelle)
  "PS", "MS", "GS",
  // Primaire
  "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
  // Collège
  "6eme", "5eme", "4eme", "3eme",
  // Lycée (2nde is orientation year, then série-specific)
  "2nde", "1ere", "Terminale",
] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  PS: "Petite Section", MS: "Moyenne Section", GS: "Grande Section",
  CP1: "CP1", CP2: "CP2", CE1: "CE1", CE2: "CE2", CM1: "CM1", CM2: "CM2",
  "6eme": "6ème", "5eme": "5ème", "4eme": "4ème", "3eme": "3ème",
  "2nde": "2nde", "1ere": "1ère", Terminale: "Terminale",
};

export const GRADE_GROUPS = {
  prescolaire: ["PS", "MS", "GS"] as const,
  primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"] as const,
  college: ["6eme", "5eme", "4eme", "3eme"] as const,
  lycee: ["2nde", "1ere", "Terminale"] as const,
} as const;

export const GRADE_GROUP_LABELS = {
  prescolaire: "Préscolaire (Maternelle)",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
} as const;

// ─── LYCÉE SÉRIES ───
// Série determines subject focus + exam coefficients at lycée level

export const LYCEE_SERIES_GENERAL = ["A1", "A2", "C", "D"] as const;
export const LYCEE_SERIES_TECHNIQUE = ["E", "F1", "F2", "F3", "F4", "G1", "G2", "H"] as const;
export const LYCEE_SERIES = [...LYCEE_SERIES_GENERAL, ...LYCEE_SERIES_TECHNIQUE] as const;
export type LyceeSerie = (typeof LYCEE_SERIES)[number];

export const LYCEE_SERIE_LABELS: Record<LyceeSerie, string> = {
  // Général
  A1: "Série A1 — Lettres-Langues",
  A2: "Série A2 — Lettres-Arts",
  C: "Série C — Maths-Physique",
  D: "Série D — Maths-SVT",
  // Technique
  E: "Série E — Mathématiques-Technique",
  F1: "Série F1 — Fabrication Mécanique",
  F2: "Série F2 — Électronique",
  F3: "Série F3 — Électrotechnique",
  F4: "Série F4 — Génie Civil",
  G1: "Série G1 — Techniques Administratives",
  G2: "Série G2 — Comptabilité-Gestion",
  H: "Série H — Informatique",
};

export const LYCEE_SERIE_SHORT_LABELS: Record<LyceeSerie, string> = {
  A1: "A1 Lettres-Langues", A2: "A2 Lettres-Arts",
  C: "C Maths-Physique", D: "D Maths-SVT",
  E: "E Maths-Technique", F1: "F1 Mécanique", F2: "F2 Électronique",
  F3: "F3 Électrotechnique", F4: "F4 Génie Civil",
  G1: "G1 Administratif", G2: "G2 Comptabilité", H: "H Informatique",
};

// ─── SUBJECTS (Complete CI curriculum + enrichment + international) ───
export const SUBJECTS = [
  // Core curriculum
  "francais", "mathematiques", "sciences", "histoire_geo",
  "education_civique", "anglais", "physique_chimie", "svt",
  "technologie", "philosophie", "economie", "comptabilite",
  "eps",
  // Foreign languages
  "espagnol", "allemand",
  // Technical lycée subjects
  "droit", "maths_financieres", "physique_appliquee",
  "technologie_industrielle", "dessin_technique",
  "techniques_administratives", "electronique", "electrotechnique",
  "genie_civil", "fabrication_mecanique", "informatique",
  // Enrichment & international languages
  "coding", "art", "musique",
  "chinois", "arabe", "portugais", "japonais", "coreen",
  // Préscolaire
  "eveil", "graphisme", "langage",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  // Core
  francais: "Français",
  mathematiques: "Mathématiques",
  sciences: "Sciences",
  histoire_geo: "Histoire-Géographie",
  education_civique: "Éducation civique",
  anglais: "Anglais",
  physique_chimie: "Physique-Chimie",
  svt: "SVT (Sciences de la Vie et de la Terre)",
  technologie: "Technologie",
  philosophie: "Philosophie",
  economie: "Économie",
  comptabilite: "Comptabilité",
  eps: "EPS (Éducation Physique et Sportive)",
  // Foreign languages
  espagnol: "Espagnol",
  allemand: "Allemand",
  // Technical
  droit: "Droit",
  maths_financieres: "Mathématiques Financières",
  physique_appliquee: "Physique Appliquée",
  technologie_industrielle: "Technologie Industrielle",
  dessin_technique: "Dessin Technique",
  techniques_administratives: "Techniques Administratives",
  electronique: "Électronique",
  electrotechnique: "Électrotechnique",
  genie_civil: "Génie Civil",
  fabrication_mecanique: "Fabrication Mécanique",
  informatique: "Informatique",
  // Enrichment & international languages
  coding: "Programmation",
  art: "Art",
  musique: "Musique",
  chinois: "Chinois (Mandarin)",
  arabe: "Arabe",
  portugais: "Portugais",
  japonais: "Japonais",
  coreen: "Coréen",
  // Préscolaire
  eveil: "Éveil",
  graphisme: "Graphisme & Écriture",
  langage: "Langage",
};

// ─── SUBJECTS BY LEVEL ───
export const SUBJECTS_BY_LEVEL = {
  prescolaire: ["langage", "graphisme", "eveil"] as const,
  primaire: ["francais", "mathematiques", "sciences", "histoire_geo", "education_civique", "anglais", "eps"] as const,
  college: ["francais", "mathematiques", "anglais", "physique_chimie", "svt", "histoire_geo", "education_civique", "technologie", "espagnol", "eps"] as const,
  lycee: ["francais", "mathematiques", "anglais", "philosophie", "histoire_geo", "eps"] as const,
  enrichment: ["coding", "art", "musique"] as const,
  international_languages: ["chinois", "arabe", "portugais", "japonais", "coreen"] as const,
} as const;

// ─── SUBJECTS BY SÉRIE (Lycée — dominant subjects per specialization) ───
export const SUBJECTS_BY_SERIE: Record<LyceeSerie, readonly string[]> = {
  // Général
  A1: ["francais", "philosophie", "anglais", "espagnol", "histoire_geo", "allemand"],
  A2: ["francais", "philosophie", "anglais", "art", "histoire_geo"],
  C: ["mathematiques", "physique_chimie", "svt", "francais", "anglais", "philosophie"],
  D: ["mathematiques", "svt", "physique_chimie", "francais", "anglais", "philosophie"],
  // Technique
  E: ["mathematiques", "physique_appliquee", "technologie_industrielle", "dessin_technique", "anglais"],
  F1: ["fabrication_mecanique", "dessin_technique", "mathematiques", "physique_appliquee"],
  F2: ["electronique", "mathematiques", "physique_appliquee", "dessin_technique"],
  F3: ["electrotechnique", "mathematiques", "physique_appliquee", "dessin_technique"],
  F4: ["genie_civil", "dessin_technique", "mathematiques", "physique_appliquee"],
  G1: ["techniques_administratives", "droit", "economie", "francais", "anglais", "comptabilite"],
  G2: ["comptabilite", "maths_financieres", "economie", "droit", "anglais"],
  H: ["informatique", "mathematiques", "physique_appliquee", "anglais", "coding"],
};

// ─── BAC COEFFICIENTS (Terminale — approximate, drives recommendations + pricing) ───
// Higher coefficient = higher stakes = more tutoring demand
export type CoefficientTable = Partial<Record<Subject, number>>;

export const BAC_COEFFICIENTS: Record<LyceeSerie, CoefficientTable> = {
  // Général
  A1: { philosophie: 5, francais: 4, anglais: 3, espagnol: 3, histoire_geo: 3, mathematiques: 1, physique_chimie: 1, svt: 1, eps: 1 },
  A2: { philosophie: 5, francais: 4, art: 4, anglais: 3, histoire_geo: 3, mathematiques: 1, eps: 1 },
  C: { mathematiques: 5, physique_chimie: 4, svt: 2, philosophie: 2, francais: 2, anglais: 2, histoire_geo: 2, eps: 1 },
  D: { mathematiques: 4, svt: 4, physique_chimie: 3, philosophie: 2, francais: 2, anglais: 2, histoire_geo: 2, eps: 1 },
  // Technique
  E: { mathematiques: 5, physique_appliquee: 4, technologie_industrielle: 4, dessin_technique: 3, francais: 2, anglais: 2, eps: 1 },
  F1: { fabrication_mecanique: 5, dessin_technique: 4, mathematiques: 3, physique_appliquee: 3, francais: 2, anglais: 2, eps: 1 },
  F2: { electronique: 5, mathematiques: 3, physique_appliquee: 4, dessin_technique: 3, francais: 2, anglais: 2, eps: 1 },
  F3: { electrotechnique: 5, mathematiques: 3, physique_appliquee: 4, dessin_technique: 3, francais: 2, anglais: 2, eps: 1 },
  F4: { genie_civil: 5, dessin_technique: 4, mathematiques: 3, physique_appliquee: 3, francais: 2, anglais: 2, eps: 1 },
  G1: { techniques_administratives: 5, droit: 4, economie: 3, comptabilite: 3, francais: 3, anglais: 2, eps: 1 },
  G2: { comptabilite: 5, maths_financieres: 4, economie: 3, droit: 3, francais: 2, anglais: 2, eps: 1 },
  H: { informatique: 5, mathematiques: 4, physique_appliquee: 3, anglais: 2, francais: 2, eps: 1 },
};

// ─── EXAM PREPARATION ───
// National CI exams + international exams + university admissions

export const EXAM_CATEGORIES = ["national_ci", "international", "university_admission", "professional", "language_certification"] as const;
export type ExamCategory = (typeof EXAM_CATEGORIES)[number];

export const EXAM_CATEGORY_LABELS: Record<ExamCategory, string> = {
  national_ci: "Examens nationaux (Côte d'Ivoire)",
  international: "Examens internationaux",
  university_admission: "Admission universitaire",
  professional: "Concours professionnels",
  language_certification: "Certifications de langues",
};

export const TARGET_EXAMS = [
  // National CI (BAC kept for DB compatibility — BAC_GENERAL/BAC_TECHNIQUE are display variants)
  "CEPE", "CONCOURS_6EME", "BEPC", "BAC", "BAC_GENERAL", "BAC_TECHNIQUE",
  // International Baccalaureate
  "IB_DIPLOMA",
  // French system (lycées français in CI)
  "BREVET_FRANCAIS", "BAC_FRANCAIS",
  // University admission — anglophone
  "SAT", "ACT", "GRE", "GMAT",
  // University admission — francophone
  "CONCOURS_GRANDES_ECOLES", "CONCOURS_INPHB", "CONCOURS_ENS",
  // Language certifications — English
  "IELTS", "TOEFL", "TOEIC", "CAMBRIDGE_FCE", "CAMBRIDGE_CAE",
  // Language certifications — French
  "DELF_B1", "DELF_B2", "DALF_C1", "TCF",
  // Language certifications — other
  "HSK", "JLPT", "DELE",
  // Professional
  "CONCOURS_FONCTION_PUBLIQUE", "CONCOURS_DOUANES", "CONCOURS_POLICE",
] as const;
export type TargetExam = (typeof TARGET_EXAMS)[number];

export const TARGET_EXAM_LABELS: Record<TargetExam, string> = {
  // National CI
  CEPE: "CEPE (Certificat d'Études Primaires)",
  CONCOURS_6EME: "Concours d'entrée en 6ème",
  BEPC: "BEPC (Brevet d'Études du Premier Cycle)",
  BAC: "Baccalauréat",
  BAC_GENERAL: "Baccalauréat Général (A, C, D)",
  BAC_TECHNIQUE: "Baccalauréat Technique (E, F, G, H)",
  // International
  IB_DIPLOMA: "International Baccalaureate (IB)",
  BREVET_FRANCAIS: "Brevet des Collèges (système français)",
  BAC_FRANCAIS: "Baccalauréat Français",
  // University admission
  SAT: "SAT (USA / Canada)",
  ACT: "ACT (USA)",
  GRE: "GRE (Graduate — USA / international)",
  GMAT: "GMAT (Business schools)",
  CONCOURS_GRANDES_ECOLES: "Concours Grandes Écoles (France)",
  CONCOURS_INPHB: "Concours INP-HB (Yamoussoukro)",
  CONCOURS_ENS: "Concours ENS (École Normale Supérieure)",
  // Language certs — English
  IELTS: "IELTS",
  TOEFL: "TOEFL",
  TOEIC: "TOEIC",
  CAMBRIDGE_FCE: "Cambridge FCE (B2 First)",
  CAMBRIDGE_CAE: "Cambridge CAE (C1 Advanced)",
  // Language certs — French
  DELF_B1: "DELF B1",
  DELF_B2: "DELF B2",
  DALF_C1: "DALF C1",
  TCF: "TCF (Test de Connaissance du Français)",
  // Language certs — other
  HSK: "HSK (Chinois)",
  JLPT: "JLPT (Japonais)",
  DELE: "DELE (Espagnol)",
  // Professional
  CONCOURS_FONCTION_PUBLIQUE: "Concours de la Fonction Publique",
  CONCOURS_DOUANES: "Concours des Douanes",
  CONCOURS_POLICE: "Concours de Police",
};

export const EXAMS_BY_CATEGORY: Record<ExamCategory, readonly TargetExam[]> = {
  national_ci: ["CEPE", "CONCOURS_6EME", "BEPC", "BAC", "BAC_GENERAL", "BAC_TECHNIQUE"],
  international: ["IB_DIPLOMA", "BREVET_FRANCAIS", "BAC_FRANCAIS"],
  university_admission: ["SAT", "ACT", "GRE", "GMAT", "CONCOURS_GRANDES_ECOLES", "CONCOURS_INPHB", "CONCOURS_ENS"],
  language_certification: ["IELTS", "TOEFL", "TOEIC", "CAMBRIDGE_FCE", "CAMBRIDGE_CAE", "DELF_B1", "DELF_B2", "DALF_C1", "TCF", "HSK", "JLPT", "DELE"],
  professional: ["CONCOURS_FONCTION_PUBLIQUE", "CONCOURS_DOUANES", "CONCOURS_POLICE"],
};

// ─── TUTORING CATEGORIES (demand-driven, beyond curriculum) ───
// Teachers can offer services in these categories to capture broader market

export const TUTORING_CATEGORIES = [
  "curriculum",           // Standard CI curriculum tutoring
  "exam_prep",            // Exam-specific preparation
  "study_abroad",         // Prepare students for international studies
  "language_learning",    // Learning new languages (not in school curriculum)
  "professional_dev",     // Professional skills & certifications
  "early_childhood",      // Préscolaire / maternelle
  "special_needs",        // Learning disabilities, ADHD support, gifted programs
  "homework_help",        // Daily homework assistance
] as const;
export type TutoringCategory = (typeof TUTORING_CATEGORIES)[number];

export const TUTORING_CATEGORY_LABELS: Record<TutoringCategory, string> = {
  curriculum: "Programme scolaire",
  exam_prep: "Préparation aux examens",
  study_abroad: "Études à l'étranger",
  language_learning: "Apprentissage des langues",
  professional_dev: "Développement professionnel",
  early_childhood: "Petite enfance (Maternelle)",
  special_needs: "Besoins spécifiques",
  homework_help: "Aide aux devoirs",
};

// ─── STUDY ABROAD DESTINATIONS (popular for Ivorian students) ───
export const STUDY_DESTINATIONS = [
  "france", "canada", "usa", "uk", "belgique", "suisse",
  "maroc", "tunisie", "senegal", "chine", "turquie", "allemagne",
] as const;
export type StudyDestination = (typeof STUDY_DESTINATIONS)[number];

export const STUDY_DESTINATION_LABELS: Record<StudyDestination, string> = {
  france: "France",
  canada: "Canada",
  usa: "États-Unis",
  uk: "Royaume-Uni",
  belgique: "Belgique",
  suisse: "Suisse",
  maroc: "Maroc",
  tunisie: "Tunisie",
  senegal: "Sénégal",
  chine: "Chine",
  turquie: "Turquie",
  allemagne: "Allemagne",
};

// ─── CITIES ───
export const IVORIAN_CITIES = [
  "Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Daloa",
  "Korhogo", "Man", "Gagnoa", "Abengourou", "Divo",
] as const;
export type IvorianCity = (typeof IVORIAN_CITIES)[number];

// ─── PAYMENT ───
export const PAYMENT_PROVIDERS = ["orange_money", "wave", "mtn_momo", "paypal"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
  paypal: "PayPal (Visa/Mastercard)",
};

// ─── HELPERS ───

/** Get the highest-coefficient subjects for a série (sorted by importance) */
export function getHighStakesSubjects(serie: LyceeSerie, minCoeff = 3): Array<{ subject: Subject; coefficient: number }> {
  const coeffs = BAC_COEFFICIENTS[serie];
  return Object.entries(coeffs)
    .filter(([, coeff]) => coeff >= minCoeff)
    .sort(([, a], [, b]) => b - a)
    .map(([subject, coefficient]) => ({ subject: subject as Subject, coefficient }));
}

/** Get grade group for a grade level */
export function getGradeGroup(grade: GradeLevel): keyof typeof GRADE_GROUPS {
  for (const [group, levels] of Object.entries(GRADE_GROUPS)) {
    if ((levels as readonly string[]).includes(grade)) {
      return group as keyof typeof GRADE_GROUPS;
    }
  }
  return "primaire";
}

/** Get relevant subjects for a grade + optional série */
export function getSubjectsForStudent(grade: GradeLevel, serie?: LyceeSerie): Subject[] {
  const group = getGradeGroup(grade);

  if (group === "lycee" && serie) {
    // Série-specific subjects + common lycée subjects
    const serieSubjects = SUBJECTS_BY_SERIE[serie] ?? [];
    const common = SUBJECTS_BY_LEVEL.lycee;
    const merged = new Set([...serieSubjects, ...common]);
    return [...merged] as Subject[];
  }

  const levelSubjects = SUBJECTS_BY_LEVEL[group] ?? SUBJECTS_BY_LEVEL.primaire;
  return [...levelSubjects] as Subject[];
}
