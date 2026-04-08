export const USER_ROLES = ["parent", "teacher", "admin", "school_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GRADE_LEVELS = [
  "CP1", "CP2", "CE1", "CE2", "CM1", "CM2",
  "6eme", "5eme", "4eme", "3eme",
  "2nde", "1ere", "Terminale",
] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  CP1: "CP1", CP2: "CP2", CE1: "CE1", CE2: "CE2", CM1: "CM1", CM2: "CM2",
  "6eme": "6ème", "5eme": "5ème", "4eme": "4ème", "3eme": "3ème",
  "2nde": "2nde", "1ere": "1ère", Terminale: "Terminale",
};

export const GRADE_GROUPS = {
  primaire: ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"] as const,
  college: ["6eme", "5eme", "4eme", "3eme"] as const,
  lycee: ["2nde", "1ere", "Terminale"] as const,
} as const;

export const TARGET_EXAMS = ["CEPE", "BEPC", "BAC", "CONCOURS_6EME"] as const;
export type TargetExam = (typeof TARGET_EXAMS)[number];

export const TARGET_EXAM_LABELS: Record<TargetExam, string> = {
  CEPE: "CEPE",
  BEPC: "BEPC",
  BAC: "Baccalauréat",
  CONCOURS_6EME: "Concours 6ème",
};

export const SUBJECTS = [
  "francais", "mathematiques", "sciences", "histoire_geo",
  "education_civique", "anglais", "physique_chimie", "svt",
  "technologie", "philosophie", "economie", "comptabilite",
  "coding", "art", "musique", "sport", "langues",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  francais: "Français",
  mathematiques: "Mathématiques",
  sciences: "Sciences",
  histoire_geo: "Histoire-Géographie",
  education_civique: "Éducation civique",
  anglais: "Anglais",
  physique_chimie: "Physique-Chimie",
  svt: "SVT",
  technologie: "Technologie",
  philosophie: "Philosophie",
  economie: "Économie",
  comptabilite: "Comptabilité",
  coding: "Programmation",
  art: "Art",
  musique: "Musique",
  sport: "Sport",
  langues: "Langues",
};

export const SUBJECTS_BY_LEVEL = {
  primaire: ["francais", "mathematiques", "sciences", "histoire_geo", "education_civique"] as const,
  college: ["francais", "mathematiques", "anglais", "physique_chimie", "svt", "histoire_geo", "technologie"] as const,
  lycee: ["francais", "mathematiques", "anglais", "physique_chimie", "svt", "philosophie", "economie", "comptabilite"] as const,
  enrichment: ["coding", "art", "musique", "sport", "langues"] as const,
} as const;

export const IVORIAN_CITIES = [
  "Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Daloa",
  "Korhogo", "Man", "Gagnoa", "Abengourou", "Divo",
] as const;
export type IvorianCity = (typeof IVORIAN_CITIES)[number];

export const PAYMENT_PROVIDERS = ["orange_money", "wave", "mtn_momo"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_momo: "MTN MoMo",
};
