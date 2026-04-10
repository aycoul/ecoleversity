import crypto from "crypto";

/** Generate a unique certificate ID */
export function generateCertificateId(): string {
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `CERT-${random}`;
}

/** Format a date for certificate display (French) */
export function formatCertificateDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Generate certificate PDF as a Buffer using jspdf */
export async function generateCertificatePdf(data: {
  studentName: string;
  courseName: string;
  teacherName: string;
  completionDate: string;
  certificateId: string;
}): Promise<Buffer> {
  // Dynamic import to avoid bundling in client
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(245, 247, 255);
  doc.rect(0, 0, width, height, "F");

  // Decorative border
  doc.setDrawColor(43, 48, 144); // ev-blue
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);
  doc.setDrawColor(76, 197, 62); // ev-green
  doc.setLineWidth(0.5);
  doc.rect(14, 14, width - 28, height - 28);

  // Header
  doc.setFontSize(14);
  doc.setTextColor(43, 48, 144);
  doc.text("écoleVersity", width / 2, 30, { align: "center" });

  // Title
  doc.setFontSize(32);
  doc.setTextColor(43, 48, 144);
  doc.text("Certificat de Réussite", width / 2, 50, { align: "center" });

  // Green line
  doc.setDrawColor(76, 197, 62);
  doc.setLineWidth(1);
  doc.line(width / 2 - 40, 55, width / 2 + 40, 55);

  // "Décerné à"
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("Décerné à", width / 2, 70, { align: "center" });

  // Student name
  doc.setFontSize(28);
  doc.setTextColor(43, 48, 144);
  doc.text(data.studentName, width / 2, 85, { align: "center" });

  // Course completion text
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("pour avoir complété avec succès le cours", width / 2, 100, { align: "center" });

  // Course name
  doc.setFontSize(20);
  doc.setTextColor(43, 48, 144);
  doc.text(`« ${data.courseName} »`, width / 2, 115, { align: "center" });

  // Teacher
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Enseignant : ${data.teacherName}`, width / 2, 130, { align: "center" });

  // Date
  const dateStr = formatCertificateDate(data.completionDate);
  doc.text(`Complété le ${dateStr}`, width / 2, 140, { align: "center" });

  // Certificate ID
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`ID: ${data.certificateId}`, width / 2, 175, { align: "center" });
  doc.text("Vérifier sur ecoleversity.com/verify", width / 2, 180, { align: "center" });

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
