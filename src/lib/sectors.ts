/**
 * Single Core / Multi Sector — configuration centrale.
 * Chaque secteur déclare ses sous-secteurs et les modules (entrées sidebar) qu'il active.
 */

export type SectorId =
  | "commerce"
  | "phones"
  | "supermarket"
  | "restaurant"
  | "insurance"
  | "clinic"
  | "school"
  | "services";

export interface SubSector {
  id: string;
  label: string;
}

export interface SectorModule {
  href: string;
  iconName: string; // nom d'icône lucide (résolu côté Sidebar)
  label: string;
  badge?: "alerts"; // type de badge dynamique
}

export interface SectorConfig {
  id: SectorId;
  label: string;
  iconName: string;
  description: string;
  subSectors: SubSector[];
  modules: SectorModule[];
  /** Affiche le bouton "Nouvelle vente" du Topbar (commerce-like) */
  hasQuickSale: boolean;
}

const sharedTail: SectorModule[] = [
  { href: "/app/clients", iconName: "Users", label: "Clients" },
  { href: "/app/rapports", iconName: "FileText", label: "Rapports" },
];

export const SECTORS: Record<SectorId, SectorConfig> = {
  commerce: {
    id: "commerce",
    label: "Commerce / Boutique",
    iconName: "ShoppingBag",
    description: "Vente au détail, fidélité, suivi du stock.",
    hasQuickSale: true,
    subSectors: [
      { id: "boutique-vetements", label: "Magasin de vêtements" },
      { id: "boutique-cosmetique", label: "Boutique cosmétique" },
      { id: "informatique", label: "Boutique informatique" },
      { id: "quincaillerie", label: "Quincaillerie" },
      { id: "librairie", label: "Librairie / Papeterie" },
      { id: "generaliste", label: "Commerce général" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/stock", iconName: "Package", label: "Stock", badge: "alerts" },
      ...sharedTail,
    ],
  },
  phones: {
    id: "phones",
    label: "Magasin de téléphones",
    iconName: "Smartphone",
    description: "IMEI, SAV, accessoires.",
    hasQuickSale: true,
    subSectors: [
      { id: "tel-neuf", label: "Téléphones neufs" },
      { id: "tel-occasion", label: "Téléphones d'occasion" },
      { id: "reparation", label: "Réparation / SAV" },
      { id: "accessoires", label: "Accessoires uniquement" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/ventes", iconName: "ShoppingCart", label: "Ventes" },
      { href: "/app/stock", iconName: "Package", label: "Stock & IMEI", badge: "alerts" },
      ...sharedTail,
    ],
  },
  supermarket: {
    id: "supermarket",
    label: "Supermarché",
    iconName: "Building2",
    description: "Multi-rayons, code-barres, caisses multiples.",
    hasQuickSale: true,
    subSectors: [
      { id: "supermarche", label: "Supermarché" },
      { id: "superette", label: "Supérette / Mini-marché" },
      { id: "alimentation", label: "Alimentation générale" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/ventes", iconName: "ShoppingCart", label: "Caisses" },
      { href: "/app/stock", iconName: "Package", label: "Rayons", badge: "alerts" },
      ...sharedTail,
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant",
    iconName: "UtensilsCrossed",
    description: "Tables, cuisine, serveurs.",
    hasQuickSale: false,
    subSectors: [
      { id: "restaurant-classique", label: "Restaurant classique" },
      { id: "fast-food", label: "Fast Food" },
      { id: "bar", label: "Bar / Lounge" },
      { id: "maquis", label: "Maquis" },
      { id: "glacier", label: "Glacier / Pâtisserie" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      { href: "/app/resto/commandes", iconName: "ClipboardList", label: "Commandes" },
      { href: "/app/resto/cuisine", iconName: "ChefHat", label: "Cuisine" },
      { href: "/app/resto/tables", iconName: "Grid3x3", label: "Tables" },
      { href: "/app/resto/menu", iconName: "UtensilsCrossed", label: "Menu" },
      ...sharedTail,
    ],
  },
  insurance: {
    id: "insurance",
    label: "Assurance",
    iconName: "Shield",
    description: "Contrats, sinistres, primes.",
    hasQuickSale: false,
    subSectors: [
      { id: "auto", label: "Assurance automobile" },
      { id: "sante", label: "Assurance santé" },
      { id: "habitation", label: "Assurance habitation" },
      { id: "entreprise", label: "Assurance entreprise" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      ...sharedTail,
    ],
  },
  clinic: {
    id: "clinic",
    label: "Clinique / Pharmacie",
    iconName: "Stethoscope",
    description: "Patients, consultations, dossiers.",
    hasQuickSale: false,
    subSectors: [
      { id: "cabinet", label: "Cabinet médical" },
      { id: "clinique-privee", label: "Clinique privée" },
      { id: "centre-sante", label: "Centre de santé" },
      { id: "laboratoire", label: "Laboratoire d'analyses" },
      { id: "pharmacie", label: "Pharmacie" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      ...sharedTail,
    ],
  },
  school: {
    id: "school",
    label: "École / Formation",
    iconName: "GraduationCap",
    description: "Élèves, scolarité, paiements.",
    hasQuickSale: false,
    subSectors: [
      { id: "primaire", label: "École primaire" },
      { id: "college", label: "Collège" },
      { id: "lycee", label: "Lycée" },
      { id: "universite", label: "Université / Institut" },
      { id: "formation", label: "Centre de formation" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      ...sharedTail,
    ],
  },
  services: {
    id: "services",
    label: "Services / Conseil",
    iconName: "Briefcase",
    description: "Devis, factures, projets.",
    hasQuickSale: true,
    subSectors: [
      { id: "conseil", label: "Cabinet de conseil" },
      { id: "agence", label: "Agence (com, digital, design)" },
      { id: "btp", label: "BTP / Construction" },
      { id: "logistique", label: "Logistique / Transport" },
      { id: "autres", label: "Autres services" },
    ],
    modules: [
      { href: "/app", iconName: "LayoutDashboard", label: "Tableau de bord" },
      ...sharedTail,
    ],
  },
};

export const getSectorConfig = (id?: string | null): SectorConfig =>
  (id && (SECTORS as Record<string, SectorConfig>)[id]) || SECTORS.commerce;
