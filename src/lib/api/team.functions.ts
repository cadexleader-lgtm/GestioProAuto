import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ajoute un membre (manager/terrain) a l'entreprise du patron appelant.
// L'app n'a aucun flux d'auto-inscription pour l'equipe : le patron cree
// directement le compte avec un mot de passe temporaire qu'il communique
// lui-meme a l'employe (qui peut ensuite le changer via "Mot de passe
// oublie" sur /connexion). Necessite le service_role (creation d'un
// utilisateur Supabase Auth), donc server function + supabaseAdmin,
// jamais expose au client.
export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    companyId: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string().min(1),
    role: z.enum(["manager", "terrain"]),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", data.companyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message || "Impossible de vérifier vos droits.");
    }
    if ((membership as any)?.role !== "patron") {
      throw new Error("Seul le patron peut ajouter un membre à l'équipe.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (createError || !created?.user) {
      throw new Error(createError?.message || "Impossible de créer le compte.");
    }

    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .insert({ company_id: data.companyId, user_id: created.user.id, role: data.role });

    if (memberError) {
      // Compte auth orphelin sinon : on annule la creation pour ne pas laisser
      // trainer un utilisateur sans entreprise.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(memberError.message || "Impossible de rattacher le membre à l'entreprise.");
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.fullName });

    return { userId: created.user.id, tempPassword };
  });

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}
