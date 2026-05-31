import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logoIcon from "@/assets/gestiopro-icon.png";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — GestioPro" },
      { name: "description", content: "Connectez-vous à votre espace GestioPro." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Renseignez vos identifiants");
      return;
    }
    toast.success("Connexion réussie");
    setTimeout(() => navigate({ to: "/app" }), 500);
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
                Mot de passe
              </label>
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Se connecter <ArrowRight size={16} />
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
