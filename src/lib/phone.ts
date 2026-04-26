// Cote d'Ivoire mobile phone normalizer.
// Accepts whatever the user types (with or without spaces, dashes, parens,
// dots, leading +, leading 00, or country code 225) and returns the
// canonical +225XXXXXXXXXX form (E.164) where XXXX is the 10-digit local
// subscriber number from the 2021+ numbering plan.
//
// Returns null when the input does not fit any valid CI mobile shape.

export function normalizeCIPhone(input: string): string | null {
  if (typeof input !== "string") return null;

  // Strip everything that is not a digit or '+'.
  let s = input.replace(/[^\d+]/g, "");

  // Drop leading "00" international prefix variant.
  if (s.startsWith("00")) s = s.slice(2);
  // Drop leading +.
  if (s.startsWith("+")) s = s.slice(1);
  // Drop the country code if present.
  if (s.startsWith("225")) s = s.slice(3);

  // What remains must be exactly 10 digits per the 2021 numbering plan.
  if (!/^\d{10}$/.test(s)) return null;

  return `+225${s}`;
}

// Pretty-print a normalized CI phone for display: "+225 07 01 02 03 04".
export function formatCIPhone(canonical: string | null | undefined): string {
  if (!canonical) return "—";
  const m = /^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(canonical);
  if (!m) return canonical;
  return `+225 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`;
}
