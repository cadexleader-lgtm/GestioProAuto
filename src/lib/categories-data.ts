/**
 * Moteur de Catégories & Attributs Dynamiques
 * Cœur du sous-secteur "Boutique & Magasin" — permet à chaque commerce
 * (vêtements, téléphones, cosmétique, quincaillerie, informatique, supermarché…)
 * de définir SES propres catégories et SES propres attributs produit.
 */

export type AttributeType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "color"
  | "size"
  | "checkbox";

export interface ProductAttribute {
  id: string;
  name: string;
  type: AttributeType;
  /** Valeurs possibles pour select / size / color */
  options?: string[];
  required?: boolean;
  unit?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // emoji
  description?: string;
  attributes: ProductAttribute[];
  createdAt: string;
}

/** Bibliothèque de modèles fournie par défaut — démontre la puissance du moteur. */
export const seedCategories: Category[] = [
  {
    id: "cat_vetements",
    name: "Vêtements",
    icon: "👕",
    description: "Polos, chemises, pantalons, robes…",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "a1", name: "Taille", type: "size", options: ["XS", "S", "M", "L", "XL", "XXL"], required: true },
      { id: "a2", name: "Couleur", type: "color", options: ["Noir", "Blanc", "Bleu", "Rouge", "Vert", "Beige"], required: true },
      { id: "a3", name: "Matière", type: "select", options: ["Coton", "Polyester", "Laine", "Lin", "Soie"] },
      { id: "a4", name: "Genre", type: "select", options: ["Homme", "Femme", "Mixte", "Enfant"] },
    ],
  },
  {
    id: "cat_smartphones",
    name: "Smartphones",
    icon: "📱",
    description: "Téléphones intelligents et accessoires",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "b1", name: "IMEI", type: "text", required: true },
      { id: "b2", name: "RAM", type: "select", options: ["2 Go", "3 Go", "4 Go", "6 Go", "8 Go", "12 Go"], required: true },
      { id: "b3", name: "Stockage", type: "select", options: ["32 Go", "64 Go", "128 Go", "256 Go", "512 Go", "1 To"], required: true },
      { id: "b4", name: "Couleur", type: "color", options: ["Noir", "Blanc", "Bleu", "Or", "Argent"] },
      { id: "b5", name: "Garantie (mois)", type: "number", unit: "mois" },
    ],
  },
  {
    id: "cat_parfums",
    name: "Parfums & Cosmétique",
    icon: "💄",
    description: "Parfums, crèmes, maquillage",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "c1", name: "Contenance", type: "select", options: ["30 mL", "50 mL", "75 mL", "100 mL", "200 mL"], required: true },
      { id: "c2", name: "Marque", type: "text" },
      { id: "c3", name: "Type", type: "select", options: ["Eau de parfum", "Eau de toilette", "Crème", "Sérum", "Maquillage"] },
      { id: "c4", name: "Date de péremption", type: "date" },
    ],
  },
  {
    id: "cat_quincaillerie",
    name: "Matériel électrique",
    icon: "🔌",
    description: "Quincaillerie, électricité, plomberie",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "d1", name: "Puissance", type: "number", unit: "W" },
      { id: "d2", name: "Tension", type: "select", options: ["110 V", "220 V", "380 V"] },
      { id: "d3", name: "Dimension", type: "text" },
      { id: "d4", name: "Poids", type: "number", unit: "kg" },
      { id: "d5", name: "Conformité CE", type: "checkbox" },
    ],
  },
  {
    id: "cat_informatique",
    name: "Ordinateurs",
    icon: "💻",
    description: "Portables, fixes, périphériques",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "e1", name: "Processeur", type: "select", options: ["Intel i3", "Intel i5", "Intel i7", "Intel i9", "AMD Ryzen 5", "AMD Ryzen 7", "Apple M2", "Apple M3"], required: true },
      { id: "e2", name: "RAM", type: "select", options: ["4 Go", "8 Go", "16 Go", "32 Go", "64 Go"], required: true },
      { id: "e3", name: "SSD", type: "select", options: ["128 Go", "256 Go", "512 Go", "1 To", "2 To"] },
      { id: "e4", name: "Marque", type: "select", options: ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple", "MSI"] },
      { id: "e5", name: "Écran", type: "text", unit: "pouces" },
    ],
  },
  {
    id: "cat_supermarche",
    name: "Alimentation & Supermarché",
    icon: "🛒",
    description: "Produits alimentaires et de grande consommation",
    createdAt: "2026-01-10T08:00:00Z",
    attributes: [
      { id: "f1", name: "Marque", type: "text" },
      { id: "f2", name: "Poids / Volume", type: "text" },
      { id: "f3", name: "DLC", type: "date" },
      { id: "f4", name: "Bio", type: "checkbox" },
    ],
  },
];
