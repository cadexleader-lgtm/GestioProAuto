import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/admin";

// Outil reserve a l'operateur de la plateforme (toi) : annoncer une
// nouveaute a TOUTES les entreprises clientes de GestioAuto. Ce n'est pas
// une fonctionnalite par entreprise (aucun role "patron" ne doit y avoir
// acces pour les AUTRES entreprises) donc pas de verification via
// company_role_at_least ici -- la barriere est l'email de l'appelant,
// verifiee cote serveur (le check client dans la page n'est que du confort
// UI, jamais la vraie protection).
function assertPlatformAdmin(email: string | null | undefined) {
  if (!isPlatformAdmin(email)) {
    throw new Error("Accès réservé à l'administrateur de la plateforme.");
  }
}

async function fetchPatronRecipients() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id, name, owner_id");
  if (companiesError) throw new Error(companiesError.message || "Impossible de lister les entreprises.");

  const ownerIds = new Set((companies || []).map((c) => c.owner_id));

  const emailByUserId = new Map<string, string>();
  let page = 1;
  const perPage = 200;
  // listUsers est pagine ; on boucle jusqu'a une page incomplete.
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message || "Impossible de lister les comptes.");
    for (const u of data.users) {
      if (u.email && ownerIds.has(u.id)) emailByUserId.set(u.id, u.email);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  const recipients = (companies || [])
    .map((c) => ({ companyName: c.name, email: emailByUserId.get(c.owner_id) }))
    .filter((r): r is { companyName: string; email: string } => !!r.email);

  // Dedoublonne par email (rare, mais un meme compte pourrait posseder
  // plusieurs entreprises).
  const seen = new Set<string>();
  return recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const previewAnnouncementRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertPlatformAdmin(context.claims.email as string | undefined);
    const recipients = await fetchPatronRecipients();
    return { count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.email) };
  });

export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(20000),
    testMode: z.boolean(),
  }))
  .handler(async ({ data, context }) => {
    const callerEmail = context.claims.email as string | undefined;
    assertPlatformAdmin(callerEmail);

    const { resend, EMAIL_FROM_ANNOUNCEMENTS } = await import("@/lib/email/resend.server");
    const { announcementEmailHtml } = await import("@/lib/email/template");

    const html = announcementEmailHtml({ subject: data.subject, body: data.body });

    if (data.testMode) {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM_ANNOUNCEMENTS,
        to: [callerEmail!],
        subject: `[TEST] ${data.subject}`,
        html,
      });
      if (error) throw new Error(error.message || "Échec de l'envoi du test.");
      return { sent: 1, testMode: true };
    }

    const recipients = await fetchPatronRecipients();
    if (recipients.length === 0) return { sent: 0, testMode: false };

    // API batch Resend : 100 emails max par appel.
    const BATCH_SIZE = 100;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const { error } = await resend.batch.send(
        batch.map((r) => ({
          from: EMAIL_FROM_ANNOUNCEMENTS,
          to: [r.email],
          subject: data.subject,
          html,
        })),
      );
      if (error) throw new Error(error.message || `Échec de l'envoi (lot ${i / BATCH_SIZE + 1}).`);
      sent += batch.length;
    }

    return { sent, testMode: false };
  });
