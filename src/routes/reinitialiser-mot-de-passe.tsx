import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logoIcon from "@/assets/gestiopro-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — GestioPro" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte GestioPro." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  // Le lien envoyé par email place un jeton de récupération dans l'URL ; le SDK
  // Supabase l'échange automatiquement contre une session "recovery" au chargement.
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas");
      return;
    }
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Mot de passe mis à jour");
    setTimeout(() => navigate({ to: "/app" }), 1200);
  };

  return (
    <div className="relative min-h-screen font-sans text-foreground">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="mx-auto mb-8 inline-flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg" />
          <span className="font-display text-xl font-bold">GestioPro</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>

          {!ready && !done && (
            <p className="mt-4 text-sm text-muted-foreground">
              Lien invalide ou expiré. Redemandez un lien de réinitialisation depuis la{" "}
              <Link to="/connexion" className="font-medium text-primary hover:text-primary/80">page de connexion</Link>.
            </p>
          )}

          {ready && !done && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Choisissez un nouveau mot de passe pour votre compte.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmer le mot de passe</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Mise à jour..." : <>Définir le mot de passe <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {done && (
            <p className="mt-4 text-sm text-muted-foreground">Mot de passe mis à jour, redirection…</p>
          )}
        </div>
      </div>
    </div>
  );
}
