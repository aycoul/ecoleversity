import QRCode from "qrcode";

/**
 * Render a QR code as a PNG data URL on the server. 256×256 PNG,
 * high error-correction so it scans even after screenshot compression.
 */
export async function generatePaymentQR(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/**
 * Orange Money Côte d'Ivoire USSD auto-dial.
 * Format: *144*2*1*<recipient>*<amount># — transfer flow.
 * The hash is URL-encoded because Android dialers otherwise stop parsing
 * at the `#`. On scan from an Android phone, the default dialer opens
 * with the full USSD string pre-filled; user presses Call and the
 * Orange Money transfer UI takes over.
 *
 * iOS restricts USSD in tel: URIs — iPhone users will need to open the
 * app manually and type the number (we still show it as fallback).
 */
export function orangeMoneyUri(phoneNumber: string, amountXof: number): string {
  const digits = phoneNumber.replace(/[^\d]/g, ""); // strip +, spaces, dashes
  // Most Orange numbers are local — trim country code for the USSD recipient.
  const recipient = digits.startsWith("225") ? digits.slice(3) : digits;
  return `tel:*144*2*1*${recipient}*${amountXof}%23`;
}

/**
 * Wave custom URL scheme — opens the Wave app with recipient +
 * amount pre-filled on both iOS and Android when the app is installed.
 * If the app isn't installed, the OS shows "no app to handle this
 * link" — not ideal, but the copy-number fallback button below the
 * QR covers that case.
 */
export function waveUri(phoneNumber: string, amountXof: number): string {
  const digits = phoneNumber.replace(/\s+/g, "");
  // Wave expects the full international format including '+'
  const recipient = digits.startsWith("+") ? digits : `+${digits}`;
  return `wave://send?phone=${encodeURIComponent(recipient)}&amount=${amountXof}`;
}
