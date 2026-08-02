import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Check, ShoppingBag, Tv, Car, UtensilsCrossed,
  BarChart3, Wallet, Boxes, Users, Truck, Receipt, Sparkles, ShieldCheck,
} from "lucide-react";
import logoIcon from "@/assets/gestiopro-icon.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestioPro — L'ERP des PME africaines (Commerce, Restaurant, Véhicules, Électroménager)" },
      { name: "description", content: "GestioPro : la plateforme tout-en-un pour gérer ventes, stock, clients, fournisseurs, personnel et finances. Pensée pour le commerce africain." },
      { property: "og:title", content: "GestioPro — L'ERP des PME africaines (Commerce, Restaurant, Véhicules, Électroménager)" },
      { property: "og:description", content: "GestioPro : la plateforme tout-en-un pour gérer ventes, stock, clients, fournisseurs, personnel et finances. Pensée pour le commerce africain." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const subSectors = [
  { icon: ShoppingBag,     label: "Boutique & Magasin",     desc: "POS, caisse, stock, fidélité." },
  { icon: Tv,              label: "Vente d'Électroménager", desc: "Garanties, SAV, facturation pro." },
  { icon: Car,             label: "Vente de Véhicules",     desc: "Parc, finance, GPS, location." },
  { icon: UtensilsCrossed, label: "Restaurant & Bar Lounge", desc: "Tables, cuisine, serveurs." },
];

const cross = [
  { icon: Truck,      title: "Fournisseurs",     desc: "Achats, commandes, dettes & échéances." },
  { icon: Users,      title: "Personnel & RH",   desc: "Équipe, présences, congés, salaires." },
  { icon: Receipt,    title: "Dépenses",         desc: "10 catégories, justificatifs, graphiques." },
  { icon: Wallet,     title: "Trésorerie",       desc: "Entrées, sorties, solde temps réel." },
  { icon: BarChart3,  title: "Rapports",         desc: "CA, marges, top produits, top clients." },
  { icon: Boxes,      title: "Documents PDF",    desc: "Facture, proforma, BL, reçu, WhatsApp." },
];

const plans = [
  { name: "Starter", price: "9 000", period: "FCFA / mois", desc: "Pour démarrer une activité.", features: ["1 utilisateur", "1 point de vente", "Modules de base", "Rapports", "Support email"], highlight: false },
  { name: "Business", price: "24 000", period: "FCFA / mois", desc: "PME en croissance, multi-équipes.", features: ["5 utilisateurs", "Multi-modules", "Fournisseurs & RH", "Facturation Pro", "Crédits clients", "Support prioritaire"], highlight: true },
  { name: "Enterprise", price: "Sur devis", period: "", desc: "Multi-sites, multi-pays.", features: ["Utilisateurs illimités", "API & intégrations", "SLA dédié", "Account manager", "Formation"], highlight: false },
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-8 w-8 rounded-lg shadow-sm" />
          <span className="font-display text-lg font-bold text-slate-900">GestioPro</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#activites" className="text-sm text-slate-600 transition hover:text-slate-900">Activités</a>
          <a href="#modules" className="text-sm text-slate-600 transition hover:text-slate-900">Modules</a>
          <a href="#tarifs" className="text-sm text-slate-600 transition hover:text-slate-900">Tarifs</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/connexion" className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:px-4">
            Connexion
          </Link>
          <Link to="/inscription" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 sm:px-4">
            <span className="hidden sm:inline">Essai gratuit</span>
            <span className="sm:hidden">Essai</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans text-slate-900">
      <Nav />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles size={14} /> ERP moderne · Pensé pour le commerce africain
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Gérez toute votre PME{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">depuis un seul logiciel</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
            Ventes, stock, clients, fournisseurs, personnel, dépenses, trésorerie — GestioPro est l'ERP moderne pour boutiques, restaurants, vendeurs d'électroménager et de véhicules.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/inscription" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary/30 transition hover:bg-primary/90 sm:w-auto">
              Démarrer gratuitement <ArrowRight size={16} />
            </Link>
            <a href="#tarifs" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
              Voir les tarifs
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">14 jours d'essai · Sans carte bancaire · Configuration en 5 minutes</p>
        </motion.div>

        {/* HERO MOCKUP — floating dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-5xl [perspective:2000px]"
        >
          <div className="absolute inset-x-4 -bottom-8 h-24 rounded-[50%] bg-primary/25 blur-3xl" />
          <div
            className="relative rounded-3xl border border-slate-200/70 bg-white/80 p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            style={{ transform: "rotateX(8deg)" }}
          >
            {/* mock topbar */}
            <div className="flex items-center gap-2 rounded-t-2xl border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[11px] font-medium text-slate-500">app.gestiopro.com/tableau-de-bord</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-12 sm:p-6">
              {/* sidebar */}
              <div className="hidden sm:col-span-2 sm:flex sm:flex-col sm:gap-2">
                <div className="h-8 rounded-lg bg-primary/15" />
                <div className="h-6 rounded-lg bg-slate-100" />
                <div className="h-6 rounded-lg bg-slate-100" />
                <div className="h-6 rounded-lg bg-slate-100" />
                <div className="h-6 rounded-lg bg-slate-100" />
              </div>
              {/* main */}
              <div className="sm:col-span-10 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { l: "CA du mois", v: "12 480 000", c: "from-primary/15 to-primary/5" },
                    { l: "Ventes", v: "348", c: "from-emerald-500/15 to-emerald-500/5" },
                    { l: "Clients", v: "1 204", c: "from-blue-500/15 to-blue-500/5" },
                    { l: "Marge", v: "34 %", c: "from-violet-500/15 to-violet-500/5" },
                  ].map((k) => (
                    <div key={k.l} className={`rounded-xl bg-gradient-to-br ${k.c} p-3 border border-white`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{k.l}</p>
                      <p className="mt-1 font-display text-sm font-bold text-slate-900 sm:text-base">{k.v}</p>
                    </div>
                  ))}
                </div>
                {/* chart placeholder */}
                <div className="rounded-xl border border-slate-100 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Évolution des revenus</p>
                    <span className="text-[10px] font-medium text-emerald-600">+18,4 %</span>
                  </div>
                  <svg viewBox="0 0 400 100" className="w-full h-16">
                    <defs>
                      <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                        <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,80 C40,60 70,70 100,50 C140,25 180,55 220,35 C260,18 300,45 340,25 C370,10 390,20 400,15 L400,100 L0,100 Z" fill="url(#lg)" />
                    <path d="M0,80 C40,60 70,70 100,50 C140,25 180,55 220,35 C260,18 300,45 340,25 C370,10 390,20 400,15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
      


      {/* SOUS-SECTEURS */}
      <section id="activites" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">4 activités prises en charge</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Une plateforme, adaptée à votre métier</h2>
          <p className="mt-4 text-base text-slate-600">L'interface s'adapte automatiquement à votre activité dès l'inscription.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subSectors.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.06 }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition">
                <s.icon size={22} />
              </div>
              <h3 className="font-display text-base font-bold">{s.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Modules transversaux</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Tout ce dont une PME a besoin</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cross.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><f.icon size={20} /></div>
              <h3 className="font-display text-base font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Tarifs simples</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Un abonnement clair, sans surprise</h2>
          <p className="mt-4 text-base text-slate-600">Changez à tout moment. Annulez quand vous voulez.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative flex flex-col rounded-2xl border p-8 ${plan.highlight ? "border-primary/40 bg-gradient-to-b from-primary/5 to-white shadow-xl shadow-primary/10" : "border-slate-200 bg-white"}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/40">Le plus choisi</span>
              )}
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/inscription" className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold transition ${plan.highlight ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90" : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}>
                Commencer <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-blue-500/10 to-primary/5 p-10 text-center sm:p-16">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Prêt à digitaliser votre entreprise ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">Rejoignez des centaines de PME africaines qui pilotent leur activité avec GestioPro.</p>
          <Link to="/inscription" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary/30 transition hover:bg-primary/90">
            Démarrer gratuitement <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} GestioPro · L'ERP des PME africaines
      </footer>
    </div>
  );
}
