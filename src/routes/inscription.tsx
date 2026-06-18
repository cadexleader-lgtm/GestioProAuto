import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, ShoppingBag, Tv, Car, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoIcon from "@/assets/gestiopro-icon.png";
import { SUB_SECTORS_ARRAY, type SubSectorId } from "@/lib/sectors";
import { useUpdateCompany } from "@workspace/api-client-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte — GestioPro" },
      { name: "description", content: "Créez votre compte GestioPro en 2 étapes : activité, infos entreprise." },
    ],
  }),
  component: SignupPage,
});

const SUB_ICONS: Record<SubSectorId, LucideIcon> = {
  boutique: ShoppingBag,
  electromenager: Tv,
  vehicules: Car,
  restaurant: UtensilsCrossed,
};

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();

  const [step, setStep] = useState<1 | 2>(1);
  const [subSectorId, setSubSectorId] = useState<SubSectorId | null>(null);
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
    if (!subSectorId) { toast.error("Veuillez choisir votre activité"); return; }
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

    // Save company profile in local store (demo data)
    try {
      await updateCompany.mutateAsync({
        data: {
          name: form.company,
          ownerName: form.fullName || form.company,
          email: form.email,
          phone: form.phone,
          country: form.country,
          city: form.city || "—",
          sectorId: "commerce",
          subSectorId,
        },
      });
      await queryClient.invalidateQueries();
    } catch { /* non-blocking */ }

    setSubmitting(false);

    if (!data.session) {
      toast.success("Compte créé. Vérifiez votre email pour confirmer.");
      navigate({ to: "/connexion" });
      return;
    }
    toast.success("Compte créé ! Bienvenue sur GestioPro.");
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2.5 self-start">
          <img src={logoIcon} alt="GestioPro" className="h-9 w-9 rounded-lg shadow-sm" />
          <span className="font-display text-lg font-bold">GestioPro</span>
        </Link>

        {/* Stepper */}
        <div className="mx-auto mt-10 flex w-full max-w-sm items-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                step >= s ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-slate-200 text-slate-400"
              }`}>
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 2 && (<div className={`h-0.5 flex-1 rounded-full ${step > s ? "bg-primary" : "bg-slate-200"}`} />)}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto mt-8 w-full"
        >
          {step === 1 && (
            <div>
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Quelle est votre activité ?</h1>
                <p className="mt-3 text-sm text-slate-500">GestioPro activera les modules métiers adaptés.</p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {SUB_SECTORS_ARRAY.map((s) => {
                  const Icon = SUB_ICONS[s.id];
                  const active = subSectorId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubSectorId(s.id)}
                      className={`group flex items-start gap-4 rounded-xl border-2 p-5 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${
                        active ? "bg-primary text-white" : "bg-slate-100 text-primary"
                      }`}>
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold">{s.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => subSectorId && setStep(2)}
                disabled={!subSectorId}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                Continuer <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900">
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="mt-4 text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Votre entreprise</h1>
                <p className="mt-3 text-sm text-slate-500">Quelques infos pour configurer votre espace.</p>
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
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Pays</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                disabled={updateCompany.isPending}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
              >
                {updateCompany.isPending ? "Création..." : "Créer mon compte"} <ArrowRight size={16} />
              </button>
              <p className="mt-4 text-center text-xs text-slate-500">
                Déjà un compte ? <Link to="/connexion" className="font-medium text-primary hover:underline">Se connecter</Link>
              </p>
            </form>
          )}
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
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}
