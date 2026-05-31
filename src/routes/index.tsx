import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ShoppingBag,
  UtensilsCrossed,
  Stethoscope,
  GraduationCap,
  Shield,
  Smartphone,
  Briefcase,
  Building2,
  BarChart3,
  Wallet,
  Boxes,
  Users,
  Sparkles,
} from "lucide-react";
import logoIcon from "@/assets/gestiopro-icon.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestioPro — Le logiciel de gestion modulaire des PME africaines" },
      {
        name: "description",
        content:
          "GestioPro : une seule plateforme pour gérer ventes, stock, clients et finances — adaptée à chaque secteur (commerce, restaurant, clinique, école, assurance).",
      },
      { property: "og:title", content: "GestioPro — Gestion modulaire pour PME africaines" },
      { property: "og:description", content: "Shopify + Odoo + Zoho, pensé pour l'Afrique." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const sectors = [
  { icon: ShoppingBag, label: "Commerce & Boutiques", desc: "Caisse, stock, fidélité." },
  { icon: Smartphone, label: "Magasins de téléphones", desc: "IMEI, garanties, SAV." },
  { icon: Building2, label: "Supermarchés", desc: "Multi-rayons, code-barres." },
  { icon: UtensilsCrossed, label: "Restaurants", desc: "Tables, commandes, cuisine." },
  { icon: Shield, label: "Assurances", desc: "Contrats, sinistres, primes." },
  { icon: Stethoscope, label: "Cliniques", desc: "Patients, RDV, ordonnances." },
  { icon: GraduationCap, label: "Écoles", desc: "Élèves, notes, scolarité." },
  { icon: Briefcase, label: "Services", desc: "Devis, factures, projets." },
];

const features = [
  { icon: Wallet, title: "Paiements locaux", desc: "Wave, Orange Money, MTN, espèces, virement." },
  { icon: Boxes, title: "Stock intelligent", desc: "Alertes rupture, multi-dépôts, valorisation." },
  { icon: Users, title: "CRM & crédits", desc: "Fiches clients, dettes, relances WhatsApp." },
  { icon: BarChart3, title: "Rapports temps réel", desc: "Bénéfices, marges, top produits." },
];

const plans = [
  {
    name: "Starter",
    price: "9 000",
    period: "FCFA / mois",
    desc: "Pour démarrer une boutique ou un service.",
    features: ["1 utilisateur", "1 point de vente", "Stock & ventes", "Rapports de base", "Support email"],
    cta: "Commencer",
    highlight: false,
  },
  {
    name: "Business",
    price: "24 000",
    period: "FCFA / mois",
    desc: "Pour les PME en croissance, multi-équipes.",
    features: [
      "5 utilisateurs",
      "3 points de vente",
      "Modules sectoriels",
      "Crédits clients & WhatsApp",
      "Rapports avancés",
      "Support prioritaire",
    ],
    cta: "Essayer 14 jours",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    desc: "Multi-sites, multi-pays, intégrations sur-mesure.",
    features: [
      "Utilisateurs illimités",
      "Sites illimités",
      "API & intégrations",
      "SLA dédié",
      "Account manager",
      "Formation sur site",
    ],
    cta: "Nous contacter",
    highlight: false,
  },
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoIcon} alt="GestioPro" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold text-white">GestioPro</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#secteurs" className="text-sm text-white/70 transition hover:text-white">Secteurs</a>
          <a href="#fonctionnalites" className="text-sm text-white/70 transition hover:text-white">Fonctionnalités</a>
          <a href="#tarifs" className="text-sm text-white/70 transition hover:text-white">Tarifs</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/connexion"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white sm:inline-flex"
          >
            Connexion
          </Link>
          <Link
            to="/inscription"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
          >
            Essai gratuit <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] font-sans text-white">
      {/* Glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative">
        <Nav />

        {/* HERO */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
              <Sparkles size={14} className="text-indigo-400" />
              Un seul logiciel. Tous les secteurs. Pensé pour l'Afrique.
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Gérez votre PME{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
                en toute simplicité
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
              Ventes, stock, clients, finances — GestioPro est une plateforme modulaire qui s'adapte à votre activité,
              du commerce à la clinique en passant par le restaurant.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/inscription"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400 sm:w-auto"
              >
                Démarrer gratuitement <ArrowRight size={16} />
              </Link>
              <a
                href="#tarifs"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
              >
                Voir les tarifs
              </a>
            </div>
            <p className="mt-4 text-xs text-white/40">
              14 jours d'essai · Sans carte bancaire · Configuration en 5 minutes
            </p>
          </motion.div>

          {/* Bento highlights */}
          <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 backdrop-blur transition hover:border-indigo-400/40"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-white/60">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECTEURS */}
        <section id="secteurs" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Modulaire</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Un module activé par secteur
            </h2>
            <p className="mt-4 text-base text-white/60">
              Choisissez votre activité à l'inscription. GestioPro active uniquement ce dont vous avez besoin.
            </p>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sectors.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.06]"
              >
                <s.icon size={22} className="text-indigo-300 transition group-hover:text-indigo-200" />
                <h3 className="mt-3 font-display text-sm font-semibold text-white">{s.label}</h3>
                <p className="mt-1 text-xs text-white/50">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FONCTIONNALITES */}
        <section id="fonctionnalites" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Plateforme</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Le Shopify + Odoo des PME africaines
              </h2>
              <p className="mt-4 text-base text-white/60">
                Une plateforme unique, conçue pour la réalité locale : paiements mobile money, gestion des crédits
                clients, factures conformes, fonctionnement hors connexion.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/80">
                {[
                  "Caisse moderne, scan code-barres, ticket WhatsApp",
                  "Multi-devises XOF / XAF / NGN / GHS / USD",
                  "Multi-utilisateurs avec rôles & permissions",
                  "Export comptable, déclarations fiscales",
                  "Application web responsive, fonctionne sur mobile",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                      <Check size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-blue-500/10 blur-2xl" />
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 backdrop-blur">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-[#141432]/60 p-4">
                    <p className="text-xs text-white/50">CA du jour</p>
                    <p className="mt-2 font-display text-2xl font-bold text-white">847 500</p>
                    <p className="text-xs text-indigo-300">+12% vs hier</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#141432]/60 p-4">
                    <p className="text-xs text-white/50">Ventes</p>
                    <p className="mt-2 font-display text-2xl font-bold text-white">142</p>
                    <p className="text-xs text-white/40">tickets</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-white/10 bg-[#141432]/60 p-4">
                    <p className="text-xs text-white/50">Top produit</p>
                    <p className="mt-2 font-display text-lg font-semibold text-white">Sucre 1kg</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-indigo-500 to-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section id="tarifs" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Tarifs simples</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Un abonnement clair, sans surprise
            </h2>
            <p className="mt-4 text-base text-white/60">
              Choisissez votre formule. Changez à tout moment. Annulez quand vous voulez.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 backdrop-blur ${
                  plan.highlight
                    ? "border-indigo-400/50 bg-gradient-to-b from-indigo-500/15 to-white/[0.02] shadow-2xl shadow-indigo-500/20"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/40">
                    Le plus choisi
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/50">{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/50">{plan.period}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-white/70">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={16} className="mt-0.5 shrink-0 text-indigo-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/inscription"
                  search={{ plan: plan.name.toLowerCase() }}
                  className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {plan.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-600/30 via-indigo-700/20 to-blue-600/20 p-10 text-center sm:p-16">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.4), transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.3), transparent 50%)",
            }} />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Prêt à digitaliser votre entreprise ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
                Rejoignez des centaines de PME africaines qui pilotent leur activité avec GestioPro.
              </p>
              <Link
                to="/inscription"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#0a0a1a] shadow-xl transition hover:bg-white/90"
              >
                Créer mon compte gratuit <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-7xl border-t border-white/5 px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="" className="h-6 w-6 rounded-md" />
              <span className="font-display text-sm font-semibold text-white">GestioPro</span>
              <span className="text-xs text-white/40">© {new Date().getFullYear()}</span>
            </div>
            <p className="text-xs text-white/40">Fait avec ❤️ pour les PME africaines.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
