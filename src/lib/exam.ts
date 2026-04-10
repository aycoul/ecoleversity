/** Calculate exam score from student answers vs correct answers */
export function calculateScore(
  answers: number[],
  correct: number[],
): { score: number; total: number; percentage: number } {
  const total = correct.length;
  if (total === 0) return { score: 0, total: 0, percentage: 0 };

  const score = answers.reduce(
    (acc, answer, i) => acc + (answer === correct[i] ? 1 : 0),
    0,
  );
  const percentage = Math.round((score / total) * 100);

  return { score, total, percentage };
}

/** Format seconds into M:SS display */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Get subjects tested in each national exam */
export function getExamSubjects(examType: string): string[] {
  switch (examType) {
    case "CEPE":
      return ["francais", "mathematiques", "sciences", "histoire_geo", "education_civique"];
    case "CONCOURS_6EME":
      return ["francais", "mathematiques", "sciences", "education_civique"];
    case "BEPC":
      return ["francais", "mathematiques", "anglais", "physique_chimie", "svt", "histoire_geo"];
    case "BAC":
      return ["francais", "mathematiques", "anglais", "physique_chimie", "svt", "philosophie", "histoire_geo"];
    default:
      return [];
  }
}
