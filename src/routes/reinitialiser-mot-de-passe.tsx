import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logoIcon from "@/assets/gestiopro-icon.png";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-screen bg-[#0a0a1a] font-sans text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="mx-auto mb-8 inline-flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg" />
          <span className="font-display text-xl font-bold">GestioPro</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
          <h1 className="font-display text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>

          {!ready && !done && (
            <p className="mt-4 text-sm text-white/60">
              Lien invalide ou expiré. Redemandez un lien de réinitialisation depuis la{" "}
              <Link to="/connexion" className="font-medium text-indigo-300 hover:text-indigo-200">page de connexion</Link>.
            </p>
          )}

          {ready && !done && (
            <>
              <p className="mt-2 text-sm text-white/60">Choisissez un nouveau mot de passe pour votre compte.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Nouveau mot de passe</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Confirmer le mot de passe</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-60"
                >
                  {loading ? "Mise à jour..." : <>Définir le mot de passe <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {done && (
            <p className="mt-4 text-sm text-white/60">Mot de passe mis à jour, redirection…</p>
          )}
        </div>
      </div>
    </div>
  );
}
