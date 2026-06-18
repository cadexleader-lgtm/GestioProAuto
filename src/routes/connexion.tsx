import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import logoIcon from "@/assets/gestiopro-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — GestioPro" },
      { name: "description", content: "Connectez-vous à votre espace GestioPro." },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/connexion" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce to /app
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: search.redirect ?? "/app" });
    });
  }, [navigate, search.redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Renseignez vos identifiants");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connexion réussie");
    navigate({ to: search.redirect ?? "/app" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      setLoading(false);
      toast.error("Connexion Google impossible");
      return;
    }
    if (result.redirected) return;
    navigate({ to: search.redirect ?? "/app" });
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
          <h1 className="font-display text-2xl font-bold tracking-tight">Bon retour 👋</h1>
          <p className="mt-2 text-sm text-white/60">Connectez-vous à votre espace GestioPro.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.7 14.8.7 12 .7 7.4.7 3.5 3.4 1.6 7.3l3.5 2.7C6.1 7 8.8 5 12 5z"/><path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.5l3.7 2.9c2.2-2 3.6-5 3.6-8.5z"/><path fill="#FBBC05" d="M5.1 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.6 7.3C.6 9 0 11 0 12.3s.6 3.3 1.6 5l3.5-3z"/><path fill="#34A853" d="M12 24c3.2 0 6-1 8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.3 1.1-3.2 0-5.9-2-6.9-4.9l-3.5 2.7C3.5 20.6 7.4 24 12 24z"/></svg>
            Continuer avec Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-white/40">
            <div className="h-px flex-1 bg-white/10" /> ou <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-60"
            >
              {loading ? "Connexion..." : <>Se connecter <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/50">
            Pas encore de compte ?{" "}
            <Link to="/inscription" className="font-medium text-indigo-300 hover:text-indigo-200">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
