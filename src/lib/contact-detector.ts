export type DetectionResult = {
  isClean: boolean;
  flaggedPatterns: string[];
  sanitizedContent: string;
};

export function detectContactInfo(content: string): DetectionResult {
  const patterns = [
    // Ivorian phone numbers: 07/05/01 XX XX XX XX, +225XXXXXXXXXX
    /(?:\+?225\s?)?(?:0[1-9])\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g,
    // International phone: +XXX or 00XXX followed by digits
    /(?:\+|00)\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g,
    // Generic phone: 8+ consecutive digits
    /\b\d{8,}\b/g,
    // Email addresses
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // Social media handles and keywords
    /(?:whatsapp|telegram|facebook|instagram|snapchat|tiktok|twitter|signal)\s*[:@]?\s*[\w.]+/gi,
    // @handles
    /@[\w.]{3,}/g,
    // URLs
    /https?:\/\/[^\s]+/g,
    // "Appelez-moi" / "Mon numero" / "Mon WhatsApp" patterns
    /(?:appel(?:ez|e)?[\s-]?moi|mon\s+(?:num[ée]ro|whatsapp|t[ée]l[ée]phone|contact))/gi,
  ];

  const flaggedPatterns: string[] = [];
  let sanitizedContent = content;

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      flaggedPatterns.push(...matches);
      sanitizedContent = sanitizedContent.replace(
        pattern,
        "[contenu bloqué]"
      );
    }
  }

  return {
    isClean: flaggedPatterns.length === 0,
    flaggedPatterns,
    sanitizedContent,
  };
}
