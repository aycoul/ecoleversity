import { Resend } from "resend";

/**
 * Parent-facing session summary email. Sent once per recording, per parent,
 * after the Whisper→Claude pipeline has produced a summary. Gated upstream
 * by profiles.ai_services_enabled on the parent account.
 */
const FROM = process.env.NOTIFICATION_FROM_EMAIL
  ? `écoleVersity <${process.env.NOTIFICATION_FROM_EMAIL}>`
  : "écoleVersity <notifications@ecoleversity.com>";

let _resend: Resend | null = null;
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export type SessionSummaryEmailInput = {
  parentEmail: string;
  parentName: string;
  learnerFirstName: string;
  teacherName: string;
  subjectLabel: string;
  sessionDate: Date;
  summary: string;
  recordingUrl: string | null;
};

function fmtDate(d: Date): string {
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });
}

// Turn Claude's markdown-ish sections into tame inline HTML. We avoid a full
// markdown renderer here — the template is intentionally narrow.
function summaryToHtml(summary: string): string {
  return summary
    .split("\n")
    .map((line) => {
      const l = line.trim();
      if (!l) return "";
      if (l.startsWith("**") && l.endsWith("**")) {
        return `<h3 style="margin:16px 0 4px;color:#0f172a;font-size:15px;">${l.slice(2, -2)}</h3>`;
      }
      if (l.startsWith("•") || l.startsWith("-")) {
        return `<li style="margin:4px 0;">${l.replace(/^[•\-]\s*/, "")}</li>`;
      }
      return `<p style="margin:6px 0;line-height:1.55;">${l}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function sendSessionSummaryEmail(input: SessionSummaryEmailInput): Promise<
  { sent: true } | { sent: false; reason: string }
> {
  const resend = client();
  if (!resend) return { sent: false, reason: "RESEND_API_KEY not set" };

  const subject = `Résumé du cours de ${input.learnerFirstName} — ${input.subjectLabel}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 4px;font-size:18px;">Bonjour ${input.parentName} 👋</h2>
      <p style="margin:0 0 16px;color:#475569;">
        Voici le résumé du cours que ${input.learnerFirstName} vient de terminer avec ${input.teacherName}.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin:12px 0;">
        <div style="color:#64748b;font-size:13px;">Cours de ${input.subjectLabel}</div>
        <div style="color:#0f172a;font-size:14px;margin-top:2px;">${fmtDate(input.sessionDate)}</div>
      </div>
      ${summaryToHtml(input.summary)}
      ${
        input.recordingUrl
          ? `<p style="margin:24px 0 0;">
              <a href="${input.recordingUrl}" style="display:inline-block;background:#0ea5a4;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
                Revoir la séance →
              </a>
            </p>`
          : ""
      }
      <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;">
        Vous recevez cet email parce que le service "Résumés IA" est activé sur votre compte écoleVersity.
        Contactez le support pour vous désabonner.
      </p>
    </div>
  `;

  const text = [
    `Bonjour ${input.parentName},`,
    "",
    `Résumé du cours de ${input.learnerFirstName} avec ${input.teacherName} (${input.subjectLabel}) — ${fmtDate(input.sessionDate)}.`,
    "",
    input.summary,
    "",
    input.recordingUrl ? `Revoir la séance : ${input.recordingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM,
      to: input.parentEmail,
      subject,
      html,
      text,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
