import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, Zap, Users2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import logoIcon from "@/assets/gestiopro-icon.webp";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";

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

const highlights = [
  { icon: Zap, text: "Vente, crédit, location, maintenance — tout au même endroit" },
  { icon: Users2, text: "Toute l'équipe connectée, chacun avec son rôle" },
  { icon: ShieldCheck, text: "Vos données restent celles de votre entreprise" },
];

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/connexion" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Renseignez votre email");
      return;
    }
    if (resetLoading) return;
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setResetLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  };

  const handleGoogle = async () => {
    setLoading(true);
    // OAuth Google gere directement par Supabase Auth (pas de broker Lovable) :
    // Google -> callback Supabase -> redirectTo ci-dessous. Le SDK effectue lui-meme
    // la redirection navigateur, rien a faire apres un appel reussi.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + (search.redirect ?? "/app") },
    });
    if (error) {
      setLoading(false);
      toast.error("Connexion Google impossible");
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-foreground lg:grid lg:grid-cols-2">
      <AnimatedBackground variant="silk" className="lg:hidden" />
      {/* Panneau gauche — desktop uniquement, chaleureux et concret */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 lg:border-r lg:border-border">
        <AnimatedBackground variant="silk" />
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
        <Link to="/" className="relative inline-flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg shadow-sm" />
          <span className="font-display text-xl font-bold">GestioPro</span>
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Votre parc automobile, piloté avec précision.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <h.icon size={16} />
                </span>
                <span className="text-sm text-muted-foreground">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground/70">© {new Date().getFullYear()} GestioPro · L'ERP des PME automobiles africaines</p>
      </div>

      {/* Formulaire */}
      <div className="relative flex min-h-screen flex-col justify-center px-4 py-10 sm:px-6">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>

        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-xl font-bold">GestioPro</span>
          </Link>

          {mode === "login" ? (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">Bon retour 👋</h1>
              <p className="mt-2 text-sm text-muted-foreground">Connectez-vous à votre espace GestioPro.</p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.7 14.8.7 12 .7 7.4.7 3.5 3.4 1.6 7.3l3.5 2.7C6.1 7 8.8 5 12 5z"/><path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.5l3.7 2.9c2.2-2 3.6-5 3.6-8.5z"/><path fill="#FBBC05" d="M5.1 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.6 7.3C.6 9 0 11 0 12.3s.6 3.3 1.6 5l3.5-3z"/><path fill="#34A853" d="M12 24c3.2 0 6-1 8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.3 1.1-3.2 0-5.9-2-6.9-4.9l-3.5 2.7C3.5 20.6 7.4 24 12 24z"/></svg>
                Continuer avec Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
                    <button type="button" onClick={() => { setMode("forgot"); setResetEmail(email); setResetSent(false); }}
                      className="text-xs text-primary hover:text-primary/80">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Connexion..." : <>Se connecter <ArrowRight size={16} /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link to="/inscription" className="font-medium text-primary hover:text-primary/80">
                  Créer un compte
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">Mot de passe oublié</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {resetSent
                  ? "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé."
                  : "Indiquez votre email, on vous envoie un lien pour définir un nouveau mot de passe."}
              </p>

              {!resetSent && (
                <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="vous@entreprise.com"
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {resetLoading ? "Envoi..." : "Envoyer le lien"}
                  </button>
                </form>
              )}

              <button type="button" onClick={() => setMode("login")}
                className="mt-6 text-xs text-primary hover:text-primary/80">
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
