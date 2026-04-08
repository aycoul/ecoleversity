export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `EV-${timestamp}-${random}`.toUpperCase();
}

export function generateJitsiRoomId(): string {
  return `ecoleversity-${crypto.randomUUID().substring(0, 8)}`;
}

export function calculateSessionPrice(durationMinutes: number): number {
  if (durationMinutes <= 30) return 2000;
  if (durationMinutes <= 60) return 3500;
  return 5000;
}

export function calculateCommission(
  priceXof: number,
  rate: number = 0.2
): { commission: number; teacherAmount: number } {
  const commission = Math.round(priceXof * rate);
  return { commission, teacherAmount: priceXof - commission };
}
