import QRCode from "qrcode";

/**
 * Render a QR code as a PNG data URL on the server. We use simple
 * tel: URIs for Orange Money and Wave — scanning from the Orange
 * Money app prefills the recipient number so the parent only types
 * the amount. Wave works similarly.
 *
 * Kept lightweight: 256×256 PNG, high error-correction so the code
 * still scans if printed or screenshot-compressed.
 */
export async function generatePaymentQR(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export function orangeMoneyUri(phoneNumber: string): string {
  // Strip spaces — both tel: and Orange Money recipient format prefer
  // digits-only.
  const digits = phoneNumber.replace(/\s+/g, "");
  return `tel:${digits}`;
}

export function waveUri(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\s+/g, "");
  return `tel:${digits}`;
}
