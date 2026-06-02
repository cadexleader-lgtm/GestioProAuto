import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check,
  ShoppingBag, UtensilsCrossed, Stethoscope, GraduationCap,
  Shield, Smartphone, Briefcase, Building2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import logoIcon from "@/assets/gestiopro-icon.png";
import { SECTORS, type SectorConfig, type SectorId } from "@/lib/sectors";
import { useUpdateCompany } from "@workspace/api-client-react";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte — GestioPro" },
      { name: "description", content: "Créez votre compte GestioPro en 3 étapes : secteur, sous-secteur, entreprise." },
    ],
  }),
  component: SignupPage,
});

const SECTOR_ICONS: Record<SectorId, LucideIcon> = {
  commerce: ShoppingBag,
  phones: Smartphone,
  supermarket: Building2,
  restaurant: UtensilsCrossed,
  insurance: Shield,
  clinic: Stethoscope,
  school: GraduationCap,
  services: Briefcase,
};

const SECTORS_ARRAY: SectorConfig[] = Object.values(SECTORS);

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sectorId, setSectorId] = useState<SectorId | null>(null);
  const [subSectorId, setSubSectorId] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    country: "SN",
    city: "",
  });

  const sector = sectorId ? SECTORS[sectorId] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorId || !subSectorId) {
      toast.error("Veuillez compléter toutes les étapes");
      return;
    }
    if (!form.company || !form.email || !form.password) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    await updateCompany.mutateAsync({
      data: {
        name: form.company,
        ownerName: form.fullName || form.company,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city || "—",
        sectorId,
        subSectorId,
      },
    });
    await queryClient.invalidateQueries();

    toast.success("Compte créé ! Redirection vers votre espace…");
    setTimeout(() => navigate({ to: "/app" }), 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] font-sans text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2.5 self-start">
          <img src={logoIcon} alt="GestioPro" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold">GestioPro</span>
        </Link>

        {/* Stepper */}
        <div className="mx-auto mt-10 flex w-full max-w-md items-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  step >= s ? "bg-indigo-500 text-white" : "bg-white/10 text-white/50"
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && (
                <div className={`h-0.5 flex-1 rounded-full ${step > s ? "bg-indigo-500" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mt-8 w-full"
        >
          {/* ============ STEP 1 — Sector ============ */}
          {step === 1 && (
            <div>
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Quel est votre secteur ?
                </h1>
                <p className="mt-3 text-sm text-white/60">
                  Nous activerons les modules adaptés à votre activité.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {SECTORS_ARRAY.map((s) => {
                  const Icon = SECTOR_ICONS[s.id];
                  const active = sectorId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSectorId(s.id);
                        setSubSectorId(null);
                      }}
                      className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/20"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                          active ? "bg-indigo-500 text-white" : "bg-white/5 text-indigo-300"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold">{s.label}</p>
                        <p className="mt-0.5 text-xs text-white/50">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => sectorId && setStep(2)}
                disabled={!sectorId}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
              >
                Continuer <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ============ STEP 2 — Sub-sector ============ */}
          {step === 2 && sector && (
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
              >
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="mt-4 text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Précisez votre activité
                </h1>
                <p className="mt-3 text-sm text-white/60">
                  Catégorie au sein du secteur <strong className="text-white">{sector.label}</strong>.
                </p>
              </div>

              <div className="mt-10 grid gap-2 sm:grid-cols-2">
                {sector.subSectors.map((sub) => {
                  const active = subSectorId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubSectorId(sub.id)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-indigo-400 bg-indigo-500/15"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-sm font-medium">{sub.label}</span>
                      {active && <Check size={16} className="text-indigo-300" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => subSectorId && setStep(3)}
                disabled={!subSectorId}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
              >
                Continuer <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ============ STEP 3 — Company info ============ */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
              >
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="mt-4 text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Créez votre compte
                </h1>
                <p className="mt-3 text-sm text-white/60">
                  Vos informations restent confidentielles.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <Field label="Nom de l'entreprise *" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Ex. Restaurant Le Baobab" />
                <Field label="Votre nom complet" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="Aminata Diop" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="vous@entreprise.com" />
                  <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+221 ..." />
                </div>
                <Field label="Mot de passe *" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 8 caractères" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Dakar" />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Pays</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:bg-white/10"
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
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-60"
              >
                {updateCompany.isPending ? "Création..." : "Créer mon compte"} <ArrowRight size={16} />
              </button>
              <p className="mt-4 text-center text-xs text-white/50">
                Déjà un compte ?{" "}
                <Link to="/connexion" className="font-medium text-indigo-300 hover:text-indigo-200">
                  Se connecter
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400 focus:bg-white/10"
      />
    </div>
  );
}
