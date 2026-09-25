import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight, Check, Car, KeyRound, CreditCard, Wrench,
  BarChart3, Wallet, Boxes, Users, Truck, Receipt, Sparkles, ShieldCheck, ChevronDown, Smartphone, Menu, X, MapPin,
} from "lucide-react";
import logoIcon from "@/assets/gestiopro-icon.webp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestioAuto — L'ERP des concessionnaires et loueurs de véhicules africains" },
      { name: "description", content: "GestioAuto : la plateforme tout-en-un pour gérer ventes, crédits, locations, maintenance, clients, fournisseurs, personnel et finances de votre parc automobile." },
      { property: "og:title", content: "GestioAuto — L'ERP des concessionnaires et loueurs de véhicules africains" },
      { property: "og:description", content: "GestioAuto : la plateforme tout-en-un pour gérer ventes, crédits, locations, maintenance, clients, fournisseurs, personnel et finances de votre parc automobile." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const autoModules = [
  { icon: Car,       label: "Parc véhicules",   desc: "Fiche complète, coût de revient, statuts." },
  { icon: CreditCard, label: "Vente & crédit",  desc: "Vente cash ou échelonnée, échéancier auto." },
  { icon: KeyRound,  label: "Location",         desc: "Contrats, cautions, retours, relances." },
  { icon: Wrench,    label: "Maintenance",      desc: "Suivi garage, coûts pièces & main-d'œuvre." },
];

const cross = [
  { icon: Truck,      title: "Fournisseurs",     desc: "Achats, commandes, dettes & échéances." },
  { icon: Users,      title: "Personnel & RH",   desc: "Équipe, présences, congés, salaires." },
  { icon: Receipt,    title: "Dépenses",         desc: "Catégories, justificatifs, graphiques." },
  { icon: Wallet,     title: "Trésorerie",       desc: "Entrées, sorties, solde temps réel." },
  { icon: BarChart3,  title: "Rapports",         desc: "CA, marges, top véhicules, top clients." },
  { icon: Boxes,      title: "Documents PDF",    desc: "Facture, proforma, contrat, reçu, WhatsApp." },
];

const trustPoints = [
  "Conçu pour le marché automobile africain",
  "Vos données, votre entreprise — rien de partagé",
  "Support en français, réactif",
];

const plans = [
  {
    name: "Découverte", price: "Gratuit", period: "sans engagement", desc: "Pour essayer sans risque.",
    features: ["1 utilisateur", "Jusqu'à 5 véhicules", "Ventes cash & fiche véhicule", "Documents de base"],
    highlight: false, addOns: false,
    unlocks: "Passez à Starter pour 20 véhicules, la maintenance et les rapports",
  },
  {
    name: "Starter", price: "15 000", period: "FCFA / mois", desc: "Pour démarrer une activité.",
    features: ["Tout Découverte, plus :", "2 utilisateurs", "Jusqu'à 20 véhicules", "Ventes cash, maintenance", "Documents & rapports", "Support WhatsApp"],
    highlight: false, addOns: false,
    unlocks: "Passez à Business pour les fournisseurs, les documents Pro et les modules à la carte",
  },
  {
    name: "Business", price: "25 000", period: "FCFA / mois", desc: "PME en croissance, multi-équipes.",
    features: ["Tout Starter, plus :", "5 utilisateurs", "Jusqu'à 60 véhicules", "Fournisseurs & documents Pro", "Support prioritaire"],
    highlight: true, addOns: true,
    unlocks: null,
  },
  {
    name: "Enterprise", price: "Sur devis", period: "", desc: "Multi-sites, multi-pays.",
    features: ["Tout Business, plus :", "Utilisateurs illimités", "Parc illimité, multi-succursale", "API & intégrations", "SLA dédié, account manager", "Formation sur site"],
    highlight: false, addOns: false,
    unlocks: null,
  },
];

const addOnModules = [
  { label: "Location", price: "5 000" },
  { label: "Crédit clients", price: "5 000" },
  { label: "RH & Paie", price: "5 000" },
  { label: "Traceur GPS", price: "7 000" },
];

const faqs = [
  {
    q: "Comment se passe le paiement de l'abonnement ?",
    a: "Aucun prélèvement automatique surprise. Chaque mois, vous recevez une notification (WhatsApp ou dans l'application) avec un lien de paiement Mobile Money (MTN, Moov, Orange Money) — vous payez vous-même, quand vous voulez, avant la date d'échéance.",
  },
  {
    q: "Puis-je n'activer que les modules dont j'ai besoin ?",
    a: "Oui. Un loueur qui ne vend pas de véhicule n'a pas besoin du module Crédit, un concessionnaire pur n'a pas besoin du module Location. Sur la formule Business, chaque module additionnel s'active à la carte, vous ne payez que ce que vous utilisez.",
  },
  {
    q: "Que se passe-t-il si je ne paie pas à temps ?",
    a: "Pas de coupure brutale. L'accès passe d'abord en lecture seule après un délai de grâce, le temps de régulariser — vos données restent intactes et consultables.",
  },
  {
    q: "Mes données sont-elles partagées avec d'autres entreprises ?",
    a: "Non. Chaque entreprise cliente a son espace strictement cloisonné (multi-tenant) — personne d'autre que vos propres utilisateurs, selon leur rôle, ne peut voir vos ventes, vos clients ou vos finances.",
  },
  {
    q: "L'application fonctionne-t-elle hors connexion ?",
    a: "GestioAuto est une PWA installable sur téléphone ou ordinateur comme une application native, mais nécessite une connexion internet pour synchroniser les données en temps réel entre les membres de votre équipe.",
  },
  {
    q: "Puis-je changer de formule à tout moment ?",
    a: "Oui, à la hausse comme à la baisse, depuis les paramètres de votre compte. Aucun engagement de durée sur les formules mensuelles.",
  },
];

const NAV_LINKS = [
  { href: "#activites", label: "Activités" },
  { href: "#modules", label: "Modules" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioAuto" className="h-8 w-8 rounded-lg shadow-sm" />
          <span className="font-display text-lg font-bold text-foreground">GestioAuto</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition hover:text-foreground">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link to="/connexion" className="hidden sm:inline-flex rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted sm:px-4">
            Connexion
          </Link>
          <Link to="/inscription" className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 sm:px-4">
            <span className="hidden sm:inline">Essai gratuit</span>
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition hover:bg-muted md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link to="/connexion" onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted">
                Connexion
              </Link>
              <Link to="/inscription" onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90">
                Essai gratuit <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen font-sans text-foreground">
      {/* Fond discret pour tout le reste de la page : flouté, peu opaque —
          seul le hero ci-dessous a sa propre version nette par-dessus, pour
          que les yeux se concentrent sur le contenu une fois le hero passe
          au scroll (avant ce changement, le fond restait net et vif partout,
          ce qui laissait "transparaitre" les sections et cassait le rendu
          pro de l'accueil). */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <AnimatedBackground variant="bubbles" className="scale-110 blur-2xl opacity-35 dark:opacity-40" />
      </div>
      <Nav />

      {/* HERO — seule section avec le fond net, non flouté */}
      <section className="relative overflow-hidden">
        {/* Hauteur bornée a un ecran (h-[100dvh]) plutot que inset-0 sur toute la
            section : sur mobile, le hero (texte + boutons + maquette) est bien plus
            haut qu'un ecran une fois empile en colonne — avec inset-0, le SVG en
            preserveAspectRatio="...slice" (cover) devait alors zoomer enormement
            pour couvrir cette forme tres etroite et tres haute, ne laissant voir
            qu'un fragment agrandi d'une bulle. Borne a 100dvh, le ratio reste
            raisonnable ; l'exces est de toute facon coupe par overflow-hidden. */}
        <div className="absolute inset-x-0 top-0 -z-10 h-[100dvh]"><AnimatedBackground variant="bubbles" /></div>
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles size={14} /> ERP moderne · Pensé pour l'automobile africaine
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Gérez tout votre parc auto{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">depuis un seul logiciel</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Vente, crédit, location, maintenance, clients, fournisseurs, personnel, dépenses, trésorerie — GestioAuto est l'ERP moderne pour les concessionnaires et loueurs de véhicules.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/inscription" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary/90 sm:w-auto">
              Démarrer gratuitement <ArrowRight size={16} />
            </Link>
            <a href="#tarifs" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto">
              Voir les tarifs
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">14 jours d'essai · Sans carte bancaire · Configuration en 5 minutes</p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {trustPoints.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Check size={13} className="text-primary" /> {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* HERO MOCKUP — floating dashboard preview, badges métier auto et
            mockup téléphone superposé (rien avant ne signalait au premier
            coup d'œil "réservé au parc auto", ni ne montrait explicitement
            que l'app tourne aussi bien sur mobile que sur ordinateur). */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-5xl [perspective:2000px]"
        >
          <div className="absolute inset-x-4 -bottom-8 h-24 rounded-[50%] bg-primary/25 blur-3xl" />

          {/* Badge flottant — vente véhicule */}
          <motion.div
            initial={{ opacity: 0, y: 10, x: -10 }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute -left-3 top-8 z-20 hidden items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl sm:flex sm:-left-8 lg:-left-14"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Car size={17} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold text-foreground">Toyota Corolla vendue</span>
              <span className="block text-[10px] text-muted-foreground">Crédit · 6 mensualités</span>
            </span>
          </motion.div>

          {/* Badge flottant — maintenance */}
          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute -right-3 top-1/3 z-20 hidden items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl sm:flex sm:-right-8 lg:-right-16"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Wrench size={16} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold text-foreground">Vidange planifiée</span>
              <span className="block text-[10px] text-muted-foreground">Rappel automatique</span>
            </span>
          </motion.div>

          {/* Badge flottant — GPS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="absolute -left-3 bottom-6 z-20 hidden items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl md:flex md:-left-6 lg:-left-10"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <MapPin size={16} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold text-foreground">Position en direct</span>
              <span className="block text-[10px] text-muted-foreground">Suivi GPS du parc</span>
            </span>
          </motion.div>

          {/* Mockup téléphone superposé — même app, vue mobile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="absolute -bottom-12 -right-3 z-20 hidden w-[152px] sm:block sm:-right-5 sm:w-[168px] lg:-right-9 lg:w-[188px]"
            style={{ transform: "rotate(-6deg)" }}
          >
            <div className="overflow-hidden rounded-[1.9rem] border-[6px] border-slate-900 bg-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.5)] dark:border-slate-700">
              <div className="relative bg-background">
                <div className="absolute left-1/2 top-0 z-10 h-3.5 w-14 -translate-x-1/2 rounded-b-lg bg-slate-900 dark:bg-slate-700" />
                <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[8px] font-bold text-foreground">GestioAuto</span>
                    <span className="h-3 w-3 rounded-full bg-primary/20" />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="mb-1.5 h-9 w-full rounded-md bg-gradient-to-br from-primary/20 to-primary/5" />
                    <p className="text-[8px] font-bold text-foreground">Toyota Corolla 2019</p>
                    <p className="text-[7px] text-muted-foreground">4 500 000 FCFA</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="mb-1.5 h-9 w-full rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-500/5" />
                    <p className="text-[8px] font-bold text-foreground">Hyundai Tucson</p>
                    <p className="text-[7px] text-muted-foreground">Disponible</p>
                  </div>
                  <div className="mt-0.5 flex items-center justify-around rounded-xl bg-muted/70 py-1.5">
                    <Car size={11} className="text-primary" />
                    <KeyRound size={11} className="text-muted-foreground/50" />
                    <Wrench size={11} className="text-muted-foreground/50" />
                    <Smartphone size={11} className="text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          <div
            className="relative rounded-3xl border border-border bg-card/90 p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            style={{ transform: "rotateX(8deg)" }}
          >
            {/* mock topbar */}
            <div className="flex items-center gap-2 rounded-t-2xl border-b border-border bg-muted/70 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[11px] font-medium text-muted-foreground">app.gestioauto.com/tableau-de-bord</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-12 sm:p-6">
              {/* sidebar */}
              <div className="hidden sm:col-span-2 sm:flex sm:flex-col sm:gap-2">
                <div className="h-8 rounded-lg bg-primary/15" />
                <div className="h-6 rounded-lg bg-muted" />
                <div className="h-6 rounded-lg bg-muted" />
                <div className="h-6 rounded-lg bg-muted" />
                <div className="h-6 rounded-lg bg-muted" />
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
                    <div key={k.l} className={`rounded-xl bg-gradient-to-br ${k.c} p-3 border border-card`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{k.l}</p>
                      <p className="mt-1 font-display text-sm font-bold text-foreground sm:text-base">{k.v}</p>
                    </div>
                  ))}
                </div>
                {/* chart placeholder */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Évolution des revenus</p>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">+18,4 %</span>
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
        </div>
      </section>

      {/* MODULES AUTO */}
      <section id="activites" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Conçu pour l'automobile</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Tout votre parc, une seule plateforme</h2>
          <p className="mt-4 text-base text-muted-foreground">De l'achat du véhicule à sa vente ou sa location, chaque étape est suivie et chiffrée.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {autoModules.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon size={22} />
              </div>
              <h3 className="font-display text-base font-bold">{s.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
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
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><f.icon size={20} /></div>
              <h3 className="font-display text-base font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Tarifs simples</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Un abonnement clair, sans surprise</h2>
          <p className="mt-4 text-base text-muted-foreground">Changez à tout moment. Payez uniquement les modules que vous utilisez.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Smartphone size={13} className="text-primary" /> Paiement par Mobile Money (MTN, Moov, Orange) — jamais de prélèvement automatique sans votre action.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${plan.highlight ? "border-primary/40 bg-gradient-to-b from-primary/5 to-card shadow-xl shadow-primary/10" : "border-border bg-card"}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/40">Le plus choisi</span>
              )}
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-foreground/90">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              {plan.addOns && (
                <div className="mt-4 rounded-xl border border-dashed border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modules à la carte</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {addOnModules.map((m) => (
                      <li key={m.label} className="flex items-center justify-between">
                        <span>{m.label}</span>
                        <span className="font-medium text-foreground">+{m.price} FCFA/mois</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.unlocks && (
                <p className="mt-4 flex items-start gap-1.5 text-xs font-medium leading-snug text-primary">
                  <Sparkles size={13} className="mt-0.5 shrink-0" /> {plan.unlocks}
                </p>
              )}
              <Link to="/inscription" className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold transition ${plan.highlight ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90" : "border border-border bg-card text-foreground hover:bg-muted"}`}>
                Commencer <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Questions fréquentes</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Vous vous posez sûrement ces questions</h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => <FaqItem key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-blue-500/10 to-primary/5 p-10 text-center sm:p-16">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Prêt à digitaliser votre entreprise ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">Rejoignez les PME africaines qui pilotent leur activité automobile avec GestioAuto.</p>
          <Link to="/inscription" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary/90">
            Démarrer gratuitement <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src={logoIcon} alt="GestioAuto" className="h-7 w-7 rounded-lg" />
              <span className="font-display text-sm font-bold">GestioAuto</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
              <Link to="/politique-de-confidentialite" className="hover:text-foreground">Politique de confidentialité</Link>
              <Link to="/conditions-generales" className="hover:text-foreground">CGU</Link>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground/70 sm:text-left">
            © {new Date().getFullYear()} GestioAuto · L'ERP des PME automobiles africaines
          </p>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-5 pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}
