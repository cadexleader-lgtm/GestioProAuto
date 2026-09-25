import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadTenant, useTenant, createCompany } from "@/lib/tenant";
import { bindCompany, unbindCompany } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  ssr: false,
  // Espace authentifié : aucune valeur pour un moteur de recherche (contenu
  // par entreprise, jamais le même d'un visiteur à l'autre) — noindex évite
  // de gaspiller le budget de crawl et empêche une page vide/redirection de
  // finir indexée par erreur. Hérité par toutes les routes /app/* enfants.
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  beforeLoad: async ({ location }) => {
    // `getSession()` lit la session deja persistee localement (pas d'aller-
    // retour reseau, contrairement a `getUser()` qui revalide le JWT aupres
    // du serveur Supabase a chaque navigation) — ce garde est deja documente
    // comme purement client (UX), la vraie barriere reste RLS/JWT cote
    // serveur sur chaque requete/RPC. Gagner cet aller-retour reseau compte
    // reellement sur un reseau mobile a latence elevee, a chaque ouverture
    // de l'app.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw redirect({ to: "/connexion", search: { redirect: location.href } });
    }
  },
  component: TenantGate,
});

function TenantGate() {
  const tenant = useTenant();
  const [bound, setBound] = useState(false);

  useEffect(() => {
    void loadTenant();
  }, []);

  useEffect(() => {
    if (tenant.company) {
      void bindCompany(tenant.company.id).then(() => setBound(true));
    } else {
      unbindCompany();
      setBound(false);
    }
  }, [tenant.company?.id]);

  if (tenant.loading || (tenant.company && !bound)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  if (!tenant.company) return <CreateCompanyScreen />;

  return <Outlet />;
}

function readPending() {
  try {
    const raw = window.localStorage.getItem("gestiopro.pendingCompany");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function CreateCompanyScreen() {
  const pending = readPending();
  const [name, setName] = useState(pending?.name ?? "");
  const [fullName, setFullName] = useState(pending?.fullName ?? "");
  const [phone, setPhone] = useState(pending?.phone ?? "");
  const [address, setAddress] = useState(pending?.address ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCompany({ name: name.trim(), sector: "auto", subSector: pending?.subSector ?? "vehicules", phone, address, fullName });
      window.localStorage.removeItem("gestiopro.pendingCompany");
      toast.success("Entreprise créée", { description: "Votre espace sécurisé est prêt." });
    } catch (err: any) {
      toast.error("Création impossible", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg rounded-2xl shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Créez votre entreprise</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vos données seront isolées et accessibles uniquement par votre équipe.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Nom de l'entreprise *</Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Auto Prestige Dakar" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Votre nom complet</Label>
              <Input id="owner" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex : Moussa Diallo" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cphone">Téléphone</Label>
                <Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caddr">Adresse</Label>
                <Input id="caddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dakar, Sénégal" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon espace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
