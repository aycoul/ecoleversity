/**
 * Refund policy calculation
 *
 * Rules:
 *   > 24h before class start  → 100% refund
 *   2–24h before class start  → 50% refund
 *   < 2h before class start   → 0% refund (denied)
 *
 * Returns the approved refund amount in XOF, or null if not eligible.
 */
export function calculateRefundAmount(
  classStartTime: Date,
  totalAmountXof: number,
  now: Date = new Date()
): { eligible: boolean; amount: number; rate: number } {
  const hoursBefore = (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursBefore >= 24) {
    return { eligible: true, amount: totalAmountXof, rate: 1.0 };
  }
  if (hoursBefore >= 2) {
    return { eligible: true, amount: Math.floor(totalAmountXof * 0.5), rate: 0.5 };
  }
  return { eligible: false, amount: 0, rate: 0 };
}
