/**
 * GestioPro — Single Sector (Commerce) / Multi Sub-Sector.
 * Chaque sous-secteur déclare ses modules métiers ; les modules
 * transversaux (fournisseurs, RH, dépenses, trésorerie, documents)
 * sont ajoutés automatiquement à tous les sous-secteurs.
 */

export type SubSectorId = "boutique" | "electromenager" | "vehicules" | "restaurant";

export interface SectorModule {
  href: string;
  iconName: string;
  label: string;
  badge?: "alerts";
}

export interface SubSectorConfig {
  id: SubSectorId;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  tagline: string;
  hasQuickSale: boolean;
  metierModules: SectorModule[];
}

/** Modules transversaux ajoutés à tous les sous-secteurs */
export const CROSS_MODULES: SectorModule[] = [
  { href: "/app/clients", iconName: "Users", label: "Clients" },
  { href: "/app/fournisseurs", iconName: "Truck", label: "Fournisseurs" },
  { href: "/app/personnel", iconName: "Users2", label: "Personnel" },
  { href: "/app/depenses", iconName: "Receipt", label: "Dépenses" },
  { href: "/app/tresorerie", iconName: "Wallet", label: "Trésorerie" },
  { href: "/app/rapports", iconName: "BarChart3", label: "Rapports" },
  { href: "/app/documents", iconName: "FileText", label: "Documents" },
];

export const SUB_SECTORS: Record<SubSectorId, SubSectorConfig> = {
  boutique: {
    id: "boutique",
    label: "Boutique & Magasin",
    shortLabel: "Boutique",
    iconName: "ShoppingBag",
    description: "Caisse rapide, stock multi-catégories, fidélité clients.",
    tagline: "POS moderne pour boutiques de détail",
    hasQuickSale: true,
    metierModules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/stock", iconName: "Package", label: "Produits & Stock", badge: "alerts" },
      { href: "/app/categories", iconName: "Tags", label: "Catégories" },
    ],

  },
  electromenager: {
    id: "electromenager",
    label: "Vente d'Électroménager",
    shortLabel: "Électroménager",
    iconName: "Tv",
    description: "TV, frigos, climatiseurs — garanties, SAV, facturation pro.",
    tagline: "ERP spécialisé électroménager & SAV",
    hasQuickSale: true,
    metierModules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/stock", iconName: "Package", label: "Produits & Stock", badge: "alerts" },
      { href: "/app/elec/garanties", iconName: "ShieldCheck", label: "Garanties & SAV" },
      { href: "/app/elec/facturation", iconName: "FileSpreadsheet", label: "Facturation Pro" },
      { href: "/app/elec/credits", iconName: "CreditCard", label: "Ventes à crédit" },
    ],
  },
  vehicules: {
    id: "vehicules",
    label: "Vente de Véhicules",
    shortLabel: "Véhicules",
    iconName: "Car",
    description: "Parc auto, finance d'achat, maintenance, GPS, crédit & location.",
    tagline: "ERP automobile complet",
    hasQuickSale: false,
    metierModules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/auto/vehicules", iconName: "Car", label: "Parc véhicules" },
      { href: "/app/auto/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/auto/credits", iconName: "CreditCard", label: "Ventes à crédit" },
      { href: "/app/auto/locations", iconName: "KeyRound", label: "Locations" },
      { href: "/app/auto/maintenance", iconName: "Wrench", label: "Maintenance" },
      { href: "/app/auto/gps", iconName: "MapPin", label: "Suivi GPS" },
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant & Bar Lounge",
    shortLabel: "Restaurant",
    iconName: "UtensilsCrossed",
    description: "Tables, cuisine, bar, serveurs, tickets WhatsApp.",
    tagline: "Pilotez votre restaurant en temps réel",
    hasQuickSale: false,
    metierModules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/resto/commandes", iconName: "ClipboardList", label: "Commandes" },
      { href: "/app/resto/cuisine", iconName: "ChefHat", label: "Cuisine & Bar" },
      { href: "/app/resto/tables", iconName: "Grid3x3", label: "Tables" },
      { href: "/app/resto/reservations", iconName: "CalendarDays", label: "Réservations" },
      { href: "/app/resto/menu", iconName: "UtensilsCrossed", label: "Menu" },
    ],
  },
};

export const SUB_SECTORS_ARRAY: SubSectorConfig[] = Object.values(SUB_SECTORS);

export function getSubSectorConfig(id?: string | null): SubSectorConfig {
  if (id && (SUB_SECTORS as Record<string, SubSectorConfig>)[id]) {
    return (SUB_SECTORS as Record<string, SubSectorConfig>)[id];
  }
  return SUB_SECTORS.boutique;
}

export function getAllModules(id?: string | null): SectorModule[] {
  const sub = getSubSectorConfig(id);
  return [...sub.metierModules, ...CROSS_MODULES];
}

// ---- Backward-compatible exports (used by older code) ----
export type SectorId = "commerce";
export interface SectorConfig {
  id: SectorId;
  label: string;
  iconName: string;
  description: string;
  hasQuickSale: boolean;
  subSectors: { id: string; label: string }[];
  modules: SectorModule[];
}
export const SECTORS: Record<SectorId, SectorConfig> = {
  commerce: {
    id: "commerce",
    label: "Commerce",
    iconName: "ShoppingBag",
    description: "Toutes les activités commerciales.",
    hasQuickSale: true,
    subSectors: SUB_SECTORS_ARRAY.map((s) => ({ id: s.id, label: s.label })),
    modules: [],
  },
};
export const getSectorConfig = (_id?: string | null): SectorConfig => SECTORS.commerce;
