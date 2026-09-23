/**
 * GestioProAuto — secteur unique : véhicules (vente, location, crédit,
 * maintenance). Les modules transversaux (fournisseurs, RH, dépenses,
 * trésorerie, documents) sont ajoutés automatiquement au menu.
 */

export type SubSectorId = "vehicules";

export interface SectorModule {
  href: string;
  iconName: string;
  label: string;
}

export interface SubSectorConfig {
  id: SubSectorId;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  tagline: string;
  metierModules: SectorModule[];
  /** hrefs transversaux à masquer (déjà couverts par un module métier) */
  crossExclude?: string[];
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
  vehicules: {
    id: "vehicules",
    label: "Vente de Véhicules",
    shortLabel: "Véhicules",
    iconName: "Car",
    description: "Parc auto, finance d'achat, maintenance, GPS, crédit & location.",
    tagline: "ERP automobile complet",
    metierModules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/auto/vehicules", iconName: "Car", label: "Parc véhicules" },
      { href: "/app/auto/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/auto/credits", iconName: "CreditCard", label: "Ventes à crédit" },
      { href: "/app/auto/locations", iconName: "KeyRound", label: "Locations" },
      { href: "/app/auto/maintenance", iconName: "Wrench", label: "Maintenance" },
      { href: "/app/auto/gps", iconName: "MapPin", label: "Suivi GPS" },
      { href: "/app/auto/clients", iconName: "Users", label: "Clients auto" },
      { href: "/app/auto/rapports", iconName: "BarChart3", label: "Rapports auto" },
    ],
    crossExclude: ["/app/clients", "/app/rapports", "/app/fournisseurs"],
  },
};

export const SUB_SECTORS_ARRAY: SubSectorConfig[] = Object.values(SUB_SECTORS);

export function getSubSectorConfig(_id?: string | null): SubSectorConfig {
  return SUB_SECTORS.vehicules;
}

/** Modules transversaux réellement affichés pour un sous-secteur. */
export function getCrossModules(id?: string | null): SectorModule[] {
  const sub = getSubSectorConfig(id);
  const excluded = new Set([
    ...(sub.crossExclude ?? []),
    ...sub.metierModules.map((m) => m.href),
  ]);
  return CROSS_MODULES.filter((m) => !excluded.has(m.href));
}

export function getAllModules(id?: string | null): SectorModule[] {
  const sub = getSubSectorConfig(id);
  return [...sub.metierModules, ...getCrossModules(id)];
}
