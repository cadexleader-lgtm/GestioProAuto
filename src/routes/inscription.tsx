import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoIcon from "@/assets/gestiopro-icon.png";
import { createCompany } from "@/lib/tenant";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte — GestioPro" },
      { name: "description", content: "Créez votre compte GestioPro Auto : les infos de votre entreprise." },
    ],
  }),
  component: SignupPage,
});

const steps = [
  { icon: Clock, text: "Configuration en 5 minutes, sans installation" },
  { icon: CreditCard, text: "Sans carte bancaire pour l'essai" },
  { icon: Sparkles, text: "Votre équipe peut rejoindre l'espace dès aujourd'hui" },
];

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    company: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    country: "SN",
    city: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) { toast.error("Inscription Google impossible"); return; }
    if (result.redirected) return;
    navigate({ to: "/app" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.email || !form.password) { toast.error("Champs requis manquants"); return; }
    if (form.password.length < 8) { toast.error("Mot de passe : 8 caractères minimum"); return; }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: form.fullName || form.company,
          company_name: form.company,
        },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    const pending = {
      name: form.company,
      sector: "auto",
      subSector: "vehicules",
      phone: form.phone,
      address: [form.address, form.city].filter(Boolean).join(", "),
      fullName: form.fullName || form.company,
    };
    try { window.localStorage.setItem("gestiopro.pendingCompany", JSON.stringify(pending)); } catch { /* ignore */ }

    if (!data.session) {
      setSubmitting(false);
      toast.success("Compte créé. Vérifiez votre email pour confirmer.");
      navigate({ to: "/connexion" });
      return;
    }

    // Session available: provision the secured company workspace right away.
    try {
      await createCompany(pending);
      window.localStorage.removeItem("gestiopro.pendingCompany");
    } catch (err: any) {
      toast.error("Espace non créé", { description: err.message });
    }
    await queryClient.invalidateQueries();
    setSubmitting(false);
    toast.success("Compte créé ! Bienvenue sur GestioPro.");
    navigate({ to: "/app" });

  };

  return (
    <div className="relative min-h-screen font-sans text-foreground lg:grid lg:grid-cols-2">
      <AnimatedBackground variant="silk" className="lg:hidden" />
      {/* Panneau gauche — desktop uniquement */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 lg:border-r lg:border-border">
        <AnimatedBackground variant="silk" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
        <Link to="/" className="relative inline-flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg shadow-sm" />
          <span className="font-display text-xl font-bold">GestioPro</span>
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Votre espace de gestion automobile, prêt en quelques minutes.
          </h2>
          <ul className="mt-8 space-y-4">
            {steps.map((s) => (
              <li key={s.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon size={16} />
                </span>
                <span className="text-sm text-muted-foreground">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground/70">© {new Date().getFullYear()} GestioPro · L'ERP des PME automobiles africaines</p>
      </div>

      {/* Formulaire */}
      <div className="relative flex min-h-screen flex-col px-4 py-8 sm:px-6">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>

        <Link to="/" className="inline-flex items-center gap-2.5 self-start lg:hidden">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg shadow-sm" />
          <span className="font-display text-lg font-bold">GestioPro</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6"
        >
            <form onSubmit={handleSubmit}>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Votre entreprise</h1>
                <p className="mt-2 text-sm text-muted-foreground">Quelques infos pour configurer votre espace GestioPro Auto.</p>
              </div>

              <div className="mt-8 space-y-4">
                <Field label="Nom de l'entreprise *" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Ex. Sankara Auto" />
                <Field label="Votre nom complet" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="Aminata Diop" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="vous@entreprise.com" />
                  <Field label="Téléphone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+221 ..." />
                </div>
                <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Avenue Bourguiba, Dakar" />
                <Field label="Mot de passe *" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 8 caractères" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Dakar" />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pays</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="SN">🇸🇳 Sénégal</option>
                      <option value="CI">🇨🇮 Côte d'Ivoire</option>
                      <option value="ML">🇲🇱 Mali</option>
                      <option value="BF">🇧🇫 Burkina Faso</option>
                      <option value="CM">🇨🇲 Cameroun</option>
                      <option value="BJ">🇧🇯 Bénin</option>
                      <option value="TG">🇹🇬 Togo</option>
                      <option value="NE">🇳🇪 Niger</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Création..." : "Créer mon compte"} <ArrowRight size={16} />
              </button>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6l3-3C17.2 1.7 14.8.7 12 .7 7.4.7 3.5 3.4 1.6 7.3l3.5 2.7C6.1 7 8.8 5 12 5z"/><path fill="#4285F4" d="M23.3 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.5l3.7 2.9c2.2-2 3.6-5 3.6-8.5z"/><path fill="#FBBC05" d="M5.1 14.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L1.6 7.3C.6 9 0 11 0 12.3s.6 3.3 1.6 5l3.5-3z"/><path fill="#34A853" d="M12 24c3.2 0 6-1 8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.3 1.1-3.2 0-5.9-2-6.9-4.9l-3.5 2.7C3.5 20.6 7.4 24 12 24z"/></svg>
                Continuer avec Google
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Déjà un compte ? <Link to="/connexion" className="font-medium text-primary hover:underline">Se connecter</Link>
              </p>
            </form>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
