function layout(content: string, ctaUrl?: string, ctaLabel?: string): { html: string; text: string } {
  const ctaHtml = ctaUrl && ctaLabel
    ? `<tr><td style="padding:24px 0 0 0;text-align:center">
        <a href="${ctaUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">${ctaLabel}</a>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background-color:#059669;padding:24px;text-align:center">
    <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">écoleVersity</span>
  </td></tr>
  <tr><td style="padding:32px 24px">
    ${content}
    ${ctaHtml}
  </td></tr>
  <tr><td style="padding:24px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">
    écoleVersity &mdash; Le meilleur ma&icirc;tre de maison en ligne<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ecoleversity.com'}/settings/notifications" style="color:#6b7280;text-decoration:underline">G&eacute;rer mes notifications</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  // Plain text fallback — strip HTML
  const textContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&eacute;/g, 'e')
    .replace(/&icirc;/g, 'i')
    .trim();

  const text = ctaUrl
    ? `${textContent}\n\n${ctaLabel}: ${ctaUrl}\n\n---\nécoleVersity — Le meilleur maitre de maison en ligne`
    : `${textContent}\n\n---\nécoleVersity — Le meilleur maitre de maison en ligne`;

  return { html, text };
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://ecoleversity.com';

export function bookingConfirmedEmail(teacherName: string, date: string, time: string, price: string | number, reference: string) {
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">R&eacute;servation confirm&eacute;e !</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      Votre cours avec <strong>${teacherName}</strong> est confirm&eacute;.
    </p>
    <table style="width:100%;margin:16px 0;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Date</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${date}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Heure</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${time}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Montant</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${price} FCFA</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">R&eacute;f&eacute;rence</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600">${reference}</td></tr>
    </table>`;
  return layout(content, `${appUrl()}/dashboard/parent/sessions`, 'Voir mes cours');
}

export function paymentConfirmedEmail(teacherName: string, date: string, time: string, amount: string | number) {
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">Paiement re&ccedil;u !</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      Votre paiement de <strong>${amount} FCFA</strong> pour le cours avec <strong>${teacherName}</strong> a &eacute;t&eacute; confirm&eacute;.
    </p>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">
      Date du cours : <strong>${date}</strong> &agrave; <strong>${time}</strong>
    </p>`;
  return layout(content, `${appUrl()}/dashboard/parent/sessions`, 'Voir mes cours');
}

export function sessionReminderEmail(teacherName: string, date: string, time: string, joinUrl: string, minutesBefore: number) {
  const timeLabel = minutesBefore >= 60 ? `${Math.round(minutesBefore / 60)} heure(s)` : `${minutesBefore} minutes`;
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">Rappel : cours dans ${timeLabel}</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      Votre cours avec <strong>${teacherName}</strong> commence bient&ocirc;t.
    </p>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">
      <strong>${date}</strong> &agrave; <strong>${time}</strong>
    </p>`;
  return layout(content, joinUrl, 'Rejoindre le cours');
}

export function newMessageEmail(senderName: string, preview: string) {
  const truncated = preview.length > 100 ? preview.slice(0, 100) + '...' : preview;
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">Nouveau message</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      <strong>${senderName}</strong> vous a envoy&eacute; un message :
    </p>
    <div style="background-color:#f9fafb;border-left:3px solid #059669;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.5;font-style:italic">${truncated}</p>
    </div>`;
  return layout(content, `${appUrl()}/dashboard/messages`, 'R&eacute;pondre');
}

export function teacherVerifiedEmail(teacherName: string) {
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">F&eacute;licitations, ${teacherName} !</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      Votre profil enseignant a &eacute;t&eacute; v&eacute;rifi&eacute; et approuv&eacute;. Vous pouvez maintenant cr&eacute;er des cours et recevoir des &eacute;l&egrave;ves.
    </p>`;
  return layout(content, `${appUrl()}/dashboard/teacher`, 'Cr&eacute;er mon premier cours');
}

export function teacherRejectedEmail(teacherName: string, reason?: string) {
  const reasonLine = reason
    ? `<p style="margin:8px 0 0 0;color:#374151;font-size:15px;line-height:1.6">Motif : <em>${reason}</em></p>`
    : '';
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">V&eacute;rification non approuv&eacute;e</h2>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">
      Bonjour ${teacherName}, votre demande de v&eacute;rification n'a pas &eacute;t&eacute; approuv&eacute;e pour le moment.
    </p>
    ${reasonLine}
    <p style="margin:16px 0 0 0;color:#374151;font-size:15px;line-height:1.6">
      Vous pouvez mettre &agrave; jour votre profil et soumettre une nouvelle demande.
    </p>`;
  return layout(content, `${appUrl()}/dashboard/teacher/profile`, 'Mettre &agrave; jour mon profil');
}

export function newReviewEmail(reviewerName: string, rating: number, comment: string | undefined, className: string) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const commentLine = comment
    ? `<p style="margin:8px 0 0 0;color:#374151;font-size:14px;line-height:1.5;font-style:italic">&laquo; ${comment} &raquo;</p>`
    : '';
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">Nouvel avis re&ccedil;u</h2>
    <p style="margin:0 0 8px 0;color:#374151;font-size:15px;line-height:1.6">
      <strong>${reviewerName}</strong> a laiss&eacute; un avis sur votre cours <strong>${className}</strong>.
    </p>
    <p style="margin:0;color:#f59e0b;font-size:24px">${stars}</p>
    ${commentLine}`;
  return layout(content, `${appUrl()}/dashboard/teacher/reviews`, 'Voir mes avis');
}

export function payoutProcessedEmail(amount: string | number, provider: string) {
  const content = `
    <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px">Virement effectu&eacute;</h2>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">
      Un virement de <strong>${amount} FCFA</strong> a &eacute;t&eacute; envoy&eacute; sur votre compte <strong>${provider}</strong>.
    </p>`;
  return layout(content, `${appUrl()}/dashboard/teacher/earnings`, 'Voir mes revenus');
}
