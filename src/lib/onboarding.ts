/** État du tutoriel d'accueil (tableau de bord) — persisté en localStorage,
 * par navigateur (pas de synchronisation multi-appareil nécessaire : c'est
 * une aide ponctuelle, pas une donnée métier). */
const DASHBOARD_TOUR_DONE_KEY = "gestiopro.tour.dashboard.done";
const SIGNUP_PENDING_KEY = "gestiopro.tour.pending";
const FORCE_TOUR_KEY = "gestiopro.tour.force";

/** À appeler juste après une inscription réussie — arme le tutoriel pour
 * qu'il se déclenche automatiquement à la première visite du tableau de
 * bord (immédiate si une session existe déjà, ou après confirmation
 * d'email sinon). */
export function markSignupForTour() {
  try { localStorage.setItem(SIGNUP_PENDING_KEY, "1"); } catch { /* stockage indisponible, tant pis */ }
}

/** À appeler depuis le bouton "Relancer le tutoriel" des Paramètres. */
export function relaunchDashboardTour() {
  try { localStorage.setItem(FORCE_TOUR_KEY, "1"); } catch { /* idem */ }
}

export function shouldStartDashboardTour(): boolean {
  try {
    if (localStorage.getItem(FORCE_TOUR_KEY) === "1") return true;
    if (localStorage.getItem(DASHBOARD_TOUR_DONE_KEY)) return false;
    return localStorage.getItem(SIGNUP_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDashboardTourDone() {
  try {
    localStorage.setItem(DASHBOARD_TOUR_DONE_KEY, "1");
    localStorage.removeItem(SIGNUP_PENDING_KEY);
    localStorage.removeItem(FORCE_TOUR_KEY);
  } catch { /* idem */ }
}

export interface TourStep {
  target: string;
  title: string;
  description: string;
}

/** Cible chaque élément via un attribut `data-tour="..."` posé directement
 * sur le DOM réel (Sidebar, Topbar, tableau de bord) — plus robuste qu'un
 * sélecteur basé sur des classes qui peuvent changer avec le design. */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: "Votre menu principal",
    description: "Toutes les sections de votre activité — véhicules, ventes, locations, crédits, personnel — sont ici. Passez la souris dessus pour le déplier.",
  },
  {
    target: '[data-tour="topbar-search"]',
    title: "Recherche instantanée",
    description: "Retrouvez un véhicule, un client ou un document en tapant simplement son nom, sans naviguer entre les pages.",
  },
  {
    target: '[data-tour="notifications-bell"]',
    title: "Vos alertes",
    description: "Échéances de crédit, retours de location en retard, assurances à renouveler — tout apparaît ici automatiquement.",
  },
  {
    target: '[data-tour="dashboard-kpis"]',
    title: "Vos chiffres clés",
    description: "Chiffre d'affaires, ventes, trésorerie : l'essentiel de votre activité en un coup d'œil, toujours à jour.",
  },
  {
    target: '[data-tour="sidebar-settings"]',
    title: "Paramètres de l'entreprise",
    description: "Logo, coordonnées, équipe, modules activés, abonnement — configurez tout votre espace depuis ici.",
  },
  {
    target: '[data-tour="user-avatar"]',
    title: "Votre compte",
    description: "Vous pourrez relancer ce tutoriel à tout moment depuis Paramètres → Préférences si besoin. Bonne prise en main !",
  },
];
