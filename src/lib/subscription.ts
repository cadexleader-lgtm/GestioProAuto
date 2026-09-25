/**
 * État d'abonnement — voir le commentaire détaillé dans Settings.tsx
 * (SubscriptionCard) : aucune facturation automatisée n'existe encore côté
 * serveur, donc la formule choisie est mémorisée localement (localStorage),
 * pas synchronisée entre appareils/membres. Extrait dans son propre module
 * (plutôt que gardé local à la page Settings) pour que la Sidebar puisse
 * aussi lire la formule active (carte d'incitation à l'abonnement pour les
 * comptes en formule gratuite) sans dépendre d'un composant de page.
 */
export const PLAN_NAMES = { decouverte: "Découverte", starter: "Starter", business: "Business", enterprise: "Enterprise" } as const;
export type PlanId = keyof typeof PLAN_NAMES;

export const PLAN_STORAGE_KEY = "gestiopro.plan";

export function getCurrentPlan(): PlanId {
  try {
    return (localStorage.getItem(PLAN_STORAGE_KEY) as PlanId) || "decouverte";
  } catch {
    return "decouverte";
  }
}

export function setCurrentPlanStorage(id: PlanId) {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, id);
  } catch {
    // stockage indisponible — la formule reste "decouverte" par défaut au
    // prochain rendu, sans planter.
  }
}
