// PII detector — regex-first message moderation.
//
// Used by the messaging send-API to block phone/email/social/URL
// attempts in DMs between parent/kid/teacher. Pure function, no I/O —
// safe to call client-side for pre-send warnings too.
//
// Phase 7 will layer a Claude Haiku semantic pass on top for creative
// bypasses ("zéro sept un deux...") — this is the deterministic floor.

export type BlockReason =
  | "phone"
  | "email"
  | "social_handle"
  | "whatsapp_link"
  | "external_url"
  | "spelled_out_phone";

export type ModerationResult = {
  allowed: boolean;
  blockReason?: BlockReason;
  matchedPattern?: string;
};

// Côte d'Ivoire phone formats
//   +225 XX XX XX XX XX
//   +2250XXXXXXXXXX  (10 digits with leading 0)
//   07 12 34 56 78
//   07.12.34.56.78
//   07-12-34-56-78
//   0712345678
const CI_PHONE_REGEXES = [
  /\+\s*2\s*2\s*5[\s\d\-.]{8,16}/i, // +225 with any separators
  /\b0[1-9][\s\-.]?\d{2}[\s\-.]?\d{2}[\s\-.]?\d{2}[\s\-.]?\d{2}\b/, // 0X XX XX XX XX
  /\b\d{10}\b/, // raw 10 digits
];

// Any international phone starting with +
const INTL_PHONE_REGEX = /\+[1-9][\s\d\-.]{7,16}/;

// Email
const EMAIL_REGEX = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i;

// Social handles and platforms
const SOCIAL_PATTERNS: Array<[RegExp, string]> = [
  [/@[a-z0-9._]{3,}/i, "at-handle"],
  [/\binstagram\.com\/[a-z0-9._]+/i, "instagram"],
  [/\btiktok\.com\/[a-z0-9._@]+/i, "tiktok"],
  [/\bfacebook\.com\/[a-z0-9.\-]+/i, "facebook"],
  [/\bfb\.com\/[a-z0-9.\-]+/i, "facebook-short"],
  [/\bsnapchat\.com\/[a-z0-9.\-]+/i, "snapchat"],
  [/\btwitter\.com\/[a-z0-9_]+/i, "twitter"],
  [/\bt\.me\/[a-z0-9_]+/i, "telegram"],
];

// WhatsApp
const WHATSAPP_PATTERNS: RegExp[] = [
  /wa\.me\/\d/i,
  /chat\.whatsapp\.com/i,
  /whats\s*app[\s:]+\+?\d/i,
];

// External URLs (http/https, and bare domains in common TLDs)
const URL_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s]+/i,
  /\b[a-z0-9\-]+\.(com|net|org|io|fr|ci|ml|gabon|sn|bj|tg|gh|ng|ma)(\/[^\s]*)?/i,
];

// Spelled-out digits (French + basic English) — minimum 7 digits in sequence
// to count as a phone attempt.
const FRENCH_DIGITS = [
  "z[eé]ro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
];
const ENGLISH_DIGITS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const ALL_DIGIT_WORDS = [...FRENCH_DIGITS, ...ENGLISH_DIGITS].join("|");
const SPELLED_OUT_PHONE = new RegExp(
  `(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})[\\s\\-.,:;]+(?:${ALL_DIGIT_WORDS})`,
  "i"
);

export function detectPII(body: string): ModerationResult {
  if (!body || body.trim().length === 0) return { allowed: true };

  // 1. Emails
  const emailMatch = body.match(EMAIL_REGEX);
  if (emailMatch) {
    return {
      allowed: false,
      blockReason: "email",
      matchedPattern: emailMatch[0],
    };
  }

  // 2. WhatsApp-specific patterns (check before generic phone)
  for (const re of WHATSAPP_PATTERNS) {
    const m = body.match(re);
    if (m) {
      return {
        allowed: false,
        blockReason: "whatsapp_link",
        matchedPattern: m[0],
      };
    }
  }

  // 3. Social handles / platforms
  for (const [re, name] of SOCIAL_PATTERNS) {
    const m = body.match(re);
    if (m) {
      return {
        allowed: false,
        blockReason: "social_handle",
        matchedPattern: `${name}:${m[0]}`,
      };
    }
  }

  // 4. CI-specific phone formats
  for (const re of CI_PHONE_REGEXES) {
    const m = body.match(re);
    if (m) {
      return { allowed: false, blockReason: "phone", matchedPattern: m[0] };
    }
  }

  // 5. International phone
  const intlMatch = body.match(INTL_PHONE_REGEX);
  if (intlMatch) {
    return {
      allowed: false,
      blockReason: "phone",
      matchedPattern: intlMatch[0],
    };
  }

  // 6. URLs (after phone — avoids false positives on dotted numbers)
  for (const re of URL_PATTERNS) {
    const m = body.match(re);
    if (m) {
      return {
        allowed: false,
        blockReason: "external_url",
        matchedPattern: m[0],
      };
    }
  }

  // 7. Spelled-out digits (7+ in a row = likely phone number attempt)
  const spelledMatch = body.match(SPELLED_OUT_PHONE);
  if (spelledMatch) {
    return {
      allowed: false,
      blockReason: "spelled_out_phone",
      matchedPattern: spelledMatch[0],
    };
  }

  return { allowed: true };
}

/**
 * User-facing French error message for a block reason.
 */
export function blockReasonMessage(reason: BlockReason): string {
  switch (reason) {
    case "phone":
    case "spelled_out_phone":
      return "Les numéros de téléphone ne peuvent pas être partagés dans les messages. Utilisez EcoleVersity pour communiquer.";
    case "email":
      return "Les adresses e-mail ne peuvent pas être partagées dans les messages.";
    case "social_handle":
      return "Les comptes de réseaux sociaux ne peuvent pas être partagés dans les messages.";
    case "whatsapp_link":
      return "Les liens WhatsApp ne peuvent pas être partagés ici.";
    case "external_url":
      return "Les liens externes ne sont pas autorisés dans les messages.";
  }
}
