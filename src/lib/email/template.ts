// Gabarit HTML partage pour les emails envoyes via Resend (annonces). Table-
// based + styles inline : les clients mail (Outlook en tete) ignorent ou
// cassent le <style> classique, donc pas d'autre option fiable pour un
// rendu correct partout.

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Texte brut -> paragraphes HTML (une ligne vide = nouveau paragraphe, une
// seule ligne = saut de ligne). Volontairement simple : pas d'editeur riche
// cote UI, l'utilisateur tape du texte normal.
function paragraphsFromPlainText(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1e293b;">${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export function announcementEmailHtml({ subject, body }: { subject: string; body: string }) {
  const heading = escapeHtml(subject);
  const content = paragraphsFromPlainText(body);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0b1220,#2563eb);padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#ffffff;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:20px;font-weight:800;color:#197bff;font-family:Arial,Helvetica,sans-serif;">G</td>
                  <td style="padding-left:12px;font-size:18px;font-weight:800;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">GestioAuto</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#0b1220;font-family:Arial,Helvetica,sans-serif;">${heading}</h1>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Vous recevez cet email en tant que client GestioAuto.</p>
              <p style="margin:0;font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Pour ne plus recevoir ces emails, écrivez-nous à contact@gestioauto.com — GestioAuto, gestioauto.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
