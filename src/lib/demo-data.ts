/**
 * Demo data + tiny in-memory stores for cross modules and sub-sector modules.
 * Pure mock — persists for the session only, no API.
 */

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  contact: string;
  totalPurchases: number;
  outstandingDebt: number;
  ordersInProgress: number;
}

export const suppliers: Supplier[] = [
  { id: "f1", name: "Diallo Import", company: "Diallo & Frères SARL", phone: "+221 33 821 14 22", email: "contact@diallo-import.sn", city: "Dakar", country: "Sénégal", contact: "Mamadou Diallo", totalPurchases: 18_450_000, outstandingDebt: 1_240_000, ordersInProgress: 2 },
  { id: "f2", name: "Cosmétiques Plus", company: "CP Distribution", phone: "+221 77 555 90 12", email: "achat@cosmetiques-plus.sn", city: "Thiès", country: "Sénégal", contact: "Awa Faye", totalPurchases: 9_820_000, outstandingDebt: 0, ordersInProgress: 1 },
  { id: "f3", name: "TechAfrica", company: "TechAfrica Group", phone: "+225 27 22 11 30", email: "sales@techafrica.ci", city: "Abidjan", country: "Côte d'Ivoire", contact: "Yao Konan", totalPurchases: 31_700_000, outstandingDebt: 4_500_000, ordersInProgress: 3 },
  { id: "f4", name: "Sahel Textile", company: "Sahel Textile SA", phone: "+223 20 22 45 67", email: "info@saheltextile.ml", city: "Bamako", country: "Mali", contact: "Fatoumata Touré", totalPurchases: 7_100_000, outstandingDebt: 320_000, ordersInProgress: 0 },
  { id: "f5", name: "Auto Parts CI", company: "Auto Parts Côte d'Ivoire", phone: "+225 27 21 44 99", email: "vente@autoparts.ci", city: "Abidjan", country: "Côte d'Ivoire", contact: "Kouadio Bah", totalPurchases: 22_300_000, outstandingDebt: 0, ordersInProgress: 1 },
];

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  hiredAt: string;
  salary: number;
  status: "present" | "absent" | "leave";
}

export const employees: Employee[] = [
  { id: "e1", firstName: "Aminata", lastName: "Sankara", position: "Gérante", department: "Direction", phone: "+221 77 555 12 34", email: "aminata@sankara.shop", hiredAt: "2022-03-15", salary: 450_000, status: "present" },
  { id: "e2", firstName: "Moussa", lastName: "Diop", position: "Vendeur senior", department: "Ventes", phone: "+221 77 234 11 09", email: "moussa@sankara.shop", hiredAt: "2023-01-10", salary: 220_000, status: "present" },
  { id: "e3", firstName: "Fatou", lastName: "Ndiaye", position: "Caissière", department: "Caisse", phone: "+221 78 422 90 33", email: "fatou@sankara.shop", hiredAt: "2023-06-22", salary: 180_000, status: "present" },
  { id: "e4", firstName: "Ibrahim", lastName: "Cissé", position: "Magasinier", department: "Stock", phone: "+221 76 122 55 00", email: "ibrahim@sankara.shop", hiredAt: "2024-02-05", salary: 165_000, status: "leave" },
  { id: "e5", firstName: "Awa", lastName: "Mbaye", position: "Comptable", department: "Finance", phone: "+221 77 909 22 11", email: "awa@sankara.shop", hiredAt: "2024-09-12", salary: 280_000, status: "absent" },
  { id: "e6", firstName: "Ousmane", lastName: "Fall", position: "Livreur", department: "Logistique", phone: "+221 78 644 87 12", email: "ousmane@sankara.shop", hiredAt: "2025-04-01", salary: 150_000, status: "present" },
];

export const EXPENSE_CATEGORIES = [
  "Loyer", "Électricité", "Internet", "Eau", "Transport",
  "Marketing", "Salaires", "Réparations", "Entretien",
  "Maintenance", "Carburant", "Assurance", "Taxes & impôts",
  "Achat stock", "Achat véhicule", "Fournisseurs", "Divers",
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  date: string;
  hasReceipt: boolean;
  /** Origine de la dépense : saisie manuelle ou générée par un module. */
  source?: string;
  paidBy?: string;
  paymentMethod?: string;
  note?: string;
}

export const expenses: Expense[] = [
  { id: "x1", category: "Loyer",        label: "Loyer boutique nov.",     amount: 350_000, date: "2026-06-01", hasReceipt: true },
  { id: "x2", category: "Salaires",     label: "Salaires équipe",         amount: 1_445_000, date: "2026-06-01", hasReceipt: true },
  { id: "x3", category: "Électricité",  label: "Senelec juin",            amount: 82_000,  date: "2026-06-03", hasReceipt: true },
  { id: "x4", category: "Internet",     label: "Orange Fibre",            amount: 35_000,  date: "2026-06-05", hasReceipt: false },
  { id: "x5", category: "Marketing",    label: "Pub Facebook campagne",   amount: 120_000, date: "2026-05-28", hasReceipt: true },
  { id: "x6", category: "Transport",    label: "Carburant livraisons",    amount: 68_000,  date: "2026-06-04", hasReceipt: false },
  { id: "x7", category: "Entretien",    label: "Nettoyage hebdo",         amount: 25_000,  date: "2026-06-02", hasReceipt: false },
  { id: "x8", category: "Réparations",  label: "Climatisation atelier",   amount: 95_000,  date: "2026-05-30", hasReceipt: true },
  { id: "x9", category: "Eau",          label: "SDE mai",                 amount: 18_000,  date: "2026-05-25", hasReceipt: true },
  { id: "x10", category: "Divers",      label: "Fournitures bureau",      amount: 42_000,  date: "2026-06-06", hasReceipt: false },
];

export interface CashMovement {
  id: string;
  type: "in" | "out";
  label: string;
  amount: number;
  date: string;
  source: string;
}

export const cashMovements: CashMovement[] = [
  { id: "m1", type: "in",  label: "Vente comptoir #INV-2421", amount: 47_500,  date: "2026-06-06T10:42:00", source: "Caisse principale" },
  { id: "m2", type: "in",  label: "Vente Wave #INV-2422",     amount: 32_000,  date: "2026-06-06T11:15:00", source: "Wave" },
  { id: "m3", type: "out", label: "Achat fournisseur Diallo",  amount: 240_000, date: "2026-06-06T13:30:00", source: "Caisse principale" },
  { id: "m4", type: "in",  label: "Vente Orange Money #INV-2423", amount: 18_000, date: "2026-06-06T14:08:00", source: "Orange Money" },
  { id: "m5", type: "out", label: "Carburant véhicule livraison", amount: 25_000, date: "2026-06-06T15:50:00", source: "Caisse principale" },
  { id: "m6", type: "in",  label: "Acompte client Diop",          amount: 100_000, date: "2026-06-06T16:30:00", source: "Espèces" },
  { id: "m7", type: "out", label: "Avance salaire Moussa",        amount: 50_000,  date: "2026-06-06T17:00:00", source: "Caisse principale" },
];

// ====================== VÉHICULES ======================

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  plate: string;
  mileageKm: number;
  fuel: "Essence" | "Diesel" | "Hybride" | "Électrique";
  transmission: "Manuelle" | "Automatique";
  purchasePrice: number;
  importFees: number;
  customsFees: number;
  repairFees: number;
  maintenanceFees: number;
  sellingPrice: number;
  status: "available" | "sold" | "rented" | "maintenance";
  photo: string;
  image?: string;
  notes?: string;
  purchaseDate?: string;
  insuranceExpiry?: string;
  techControlExpiry?: string;
  carteGrise?: string;
  documents?: { id: string; name: string; type: string; dataUrl: string; uploadedAt: string; size: number }[];
}

export const vehicles: Vehicle[] = [
  { id: "v1", brand: "Toyota",   model: "Corolla 2020",     year: 2020, color: "Blanc",      vin: "JTDBR32E000123456", plate: "DK-7821-AB", mileageKm: 48_000,  fuel: "Essence", transmission: "Automatique", purchasePrice: 7_500_000, importFees: 350_000, customsFees: 1_200_000, repairFees: 180_000, maintenanceFees: 90_000, sellingPrice: 10_800_000, status: "available", photo: "🚗" },
  { id: "v2", brand: "Hyundai",  model: "Tucson 2022",      year: 2022, color: "Noir",       vin: "KMHJ381AAJUA12345", plate: "DK-9912-CD", mileageKm: 22_500,  fuel: "Diesel",  transmission: "Automatique", purchasePrice: 12_400_000, importFees: 480_000, customsFees: 1_900_000, repairFees: 0, maintenanceFees: 65_000, sellingPrice: 17_500_000, status: "available", photo: "🚙" },
  { id: "v3", brand: "Mercedes", model: "C-Class 2019",     year: 2019, color: "Gris",       vin: "WDDWF4HB1KR123456", plate: "DK-1145-EF", mileageKm: 65_200,  fuel: "Essence", transmission: "Automatique", purchasePrice: 14_000_000, importFees: 520_000, customsFees: 2_400_000, repairFees: 420_000, maintenanceFees: 180_000, sellingPrice: 19_500_000, status: "sold", photo: "🏎️" },
  { id: "v4", brand: "Renault",  model: "Duster 2021",      year: 2021, color: "Bleu",       vin: "VF1HSRGH064123456", plate: "DK-3344-GH", mileageKm: 31_800,  fuel: "Essence", transmission: "Manuelle",    purchasePrice: 6_200_000, importFees: 280_000, customsFees: 980_000,  repairFees: 95_000,  maintenanceFees: 40_000, sellingPrice: 8_900_000,  status: "rented", photo: "🚐" },
  { id: "v5", brand: "Kia",      model: "Sportage 2023",    year: 2023, color: "Rouge",      vin: "KNDPM3AC9P7123456", plate: "DK-5577-IJ", mileageKm: 8_900,   fuel: "Hybride", transmission: "Automatique", purchasePrice: 15_800_000, importFees: 600_000, customsFees: 2_650_000, repairFees: 0, maintenanceFees: 0,  sellingPrice: 22_000_000, status: "available", photo: "🚙" },
  { id: "v6", brand: "Peugeot",  model: "208 2018",         year: 2018, color: "Blanc",      vin: "VF3CCBHY6JT123456", plate: "DK-2218-KL", mileageKm: 92_000,  fuel: "Essence", transmission: "Manuelle",    purchasePrice: 3_800_000, importFees: 220_000, customsFees: 680_000,  repairFees: 240_000, maintenanceFees: 110_000, sellingPrice: 5_600_000, status: "maintenance", photo: "🚗" },
  { id: "v7", brand: "Toyota",   model: "Hilux 2020",       year: 2020, color: "Argent",     vin: "MROFR22G700123456", plate: "DK-8801-MN", mileageKm: 54_300,  fuel: "Diesel",  transmission: "Manuelle",    purchasePrice: 11_500_000, importFees: 450_000, customsFees: 1_800_000, repairFees: 0, maintenanceFees: 120_000, sellingPrice: 16_200_000, status: "available", photo: "🛻" },
  { id: "v8", brand: "Suzuki",   model: "Swift 2019",       year: 2019, color: "Bleu",       vin: "MA3FB31S5K0123456", plate: "DK-6655-OP", mileageKm: 71_200,  fuel: "Essence", transmission: "Manuelle",    purchasePrice: 3_200_000, importFees: 180_000, customsFees: 580_000,  repairFees: 130_000, maintenanceFees: 70_000, sellingPrice: 4_750_000,  status: "available", photo: "🚗" },
];

export function vehicleCost(v: Vehicle) {
  return v.purchasePrice + v.importFees + v.customsFees + v.repairFees + v.maintenanceFees;
}
export function vehicleMargin(v: Vehicle) {
  return v.sellingPrice - vehicleCost(v);
}

export interface VehicleCredit {
  id: string;
  vehicleId: string;
  customer: string;
  total: number;
  downPayment: number;
  monthlyPayment: number;
  paidMonths: number;
  totalMonths: number;
  nextDueDate: string;
  status: "ok" | "late";
}

export const vehicleCredits: VehicleCredit[] = [
  { id: "vc1", vehicleId: "v3", customer: "Société Sénégaz SARL",   total: 19_500_000, downPayment: 5_000_000, monthlyPayment: 605_000, paidMonths: 8, totalMonths: 24, nextDueDate: "2026-06-15", status: "ok" },
  { id: "vc2", vehicleId: "v1", customer: "Cabinet Médical Diop",   total: 10_800_000, downPayment: 3_000_000, monthlyPayment: 430_000, paidMonths: 4, totalMonths: 18, nextDueDate: "2026-06-10", status: "late" },
  { id: "vc3", vehicleId: "v8", customer: "Idrissa Fall",            total: 4_750_000,  downPayment: 1_200_000, monthlyPayment: 195_000, paidMonths: 12, totalMonths: 18, nextDueDate: "2026-06-20", status: "ok" },
];

export interface Rental {
  id: string;
  vehicleId: string;
  customer: string;
  phone?: string;
  address?: string;
  idDocument?: string;
  licenseNumber?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  dailyRate: number;
  deposit: number;
  advance?: number;
  totalAmount?: number;
  remaining?: number;
  returnedAt?: string;
  returnKm?: number;
  fuelLevel?: string;
  conditionNote?: string;
  status: "reserved" | "active" | "returned" | "overdue" | "cancelled";
}
export const rentals: Rental[] = [
  { id: "r1", vehicleId: "v4", customer: "Touriste Mr. Dupont", phone: "+221 77 000 11 22", startDate: "2026-06-04", endDate: "2026-06-12", dailyRate: 35_000, deposit: 200_000, status: "active" },
  { id: "r2", vehicleId: "v2", customer: "Sopra Steria mission", phone: "+221 33 800 12 12", startDate: "2026-05-28", endDate: "2026-06-08", dailyRate: 65_000, deposit: 400_000, status: "active" },
  { id: "r3", vehicleId: "v1", customer: "Aïcha Bâ", phone: "+221 78 234 45 67", startDate: "2026-05-15", endDate: "2026-05-22", dailyRate: 30_000, deposit: 150_000, status: "returned", returnedAt: "2026-05-22" },
];

export interface GPSTrack {
  vehicleId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  lastUpdate: string;
  trip: { lat: number; lng: number }[];
}

// Bbox Dakar approx
export const gpsTracks: GPSTrack[] = [
  { vehicleId: "v4", lat: 14.7167, lng: -17.4677, speedKmh: 45, lastUpdate: new Date().toISOString(), trip: [
    { lat: 14.7050, lng: -17.4600 }, { lat: 14.7080, lng: -17.4625 }, { lat: 14.7110, lng: -17.4640 },
    { lat: 14.7140, lng: -17.4660 }, { lat: 14.7167, lng: -17.4677 },
  ]},
  { vehicleId: "v2", lat: 14.6928, lng: -17.4467, speedKmh: 0,  lastUpdate: new Date(Date.now() - 12*60_000).toISOString(), trip: [
    { lat: 14.6800, lng: -17.4400 }, { lat: 14.6850, lng: -17.4430 }, { lat: 14.6900, lng: -17.4450 },
    { lat: 14.6928, lng: -17.4467 },
  ]},
];

// ====================== ÉLECTROMÉNAGER ======================

export interface ApplianceProduct {
  id: string;
  name: string;
  category: "Réfrigérateur" | "Téléviseur" | "Climatiseur" | "Congélateur" | "Machine à laver" | "Cuisinière" | "Ventilateur" | "Micro-ondes";
  brand: string;
  reference: string;
  price: number;
  cost: number;
  stock: number;
  warrantyMonths: number;
  emoji: string;
}
export const appliances: ApplianceProduct[] = [
  { id: "a1", name: "LG Frigo 410L Inox",        category: "Réfrigérateur", brand: "LG",      reference: "GR-X410EQ", price: 685_000, cost: 480_000, stock: 12, warrantyMonths: 24, emoji: "🧊" },
  { id: "a2", name: "Samsung TV QLED 55\"",      category: "Téléviseur",    brand: "Samsung", reference: "QE55Q60D",  price: 520_000, cost: 360_000, stock: 8,  warrantyMonths: 24, emoji: "📺" },
  { id: "a3", name: "Hisense Clim 1.5CV",        category: "Climatiseur",    brand: "Hisense", reference: "AS-12HR4",  price: 245_000, cost: 175_000, stock: 14, warrantyMonths: 12, emoji: "❄️" },
  { id: "a4", name: "Beko Lave-linge 9kg",       category: "Machine à laver", brand: "Beko",  reference: "WTV9712XW", price: 320_000, cost: 215_000, stock: 6,  warrantyMonths: 24, emoji: "🧺" },
  { id: "a5", name: "Brandt Cuisinière 4 feux",  category: "Cuisinière",     brand: "Brandt",  reference: "BCG6431",   price: 185_000, cost: 125_000, stock: 9,  warrantyMonths: 12, emoji: "🍳" },
  { id: "a6", name: "Haier Congélateur 300L",    category: "Congélateur",    brand: "Haier",   reference: "HF-300WEN", price: 420_000, cost: 290_000, stock: 4,  warrantyMonths: 24, emoji: "🥶" },
  { id: "a7", name: "Samsung Micro-ondes 28L",   category: "Micro-ondes",    brand: "Samsung", reference: "MS28J5215", price: 95_000,  cost: 62_000,  stock: 18, warrantyMonths: 12, emoji: "🍱" },
  { id: "a8", name: "Hisense TV LED 43\"",       category: "Téléviseur",     brand: "Hisense", reference: "43A4K",     price: 215_000, cost: 152_000, stock: 11, warrantyMonths: 24, emoji: "📺" },
];

export interface Warranty {
  id: string;
  productName: string;
  reference: string;
  customer: string;
  phone: string;
  soldAt: string;
  expiresAt: string;
  status: "active" | "expired" | "claim";
}
export const warranties: Warranty[] = [
  { id: "w1", productName: "LG Frigo 410L Inox",  reference: "GR-X410EQ", customer: "Moussa Diop",   phone: "+221 77 123 45 67", soldAt: "2025-09-12", expiresAt: "2027-09-12", status: "active" },
  { id: "w2", productName: "Samsung TV QLED 55\"", reference: "QE55Q60D", customer: "Fatou Ndiaye",  phone: "+221 78 987 65 43", soldAt: "2024-11-30", expiresAt: "2026-11-30", status: "active" },
  { id: "w3", productName: "Hisense Clim 1.5CV",  reference: "AS-12HR4",  customer: "Ibrahim Cissé", phone: "+221 76 222 11 00", soldAt: "2024-03-15", expiresAt: "2025-03-15", status: "expired" },
  { id: "w4", productName: "Beko Lave-linge 9kg", reference: "WTV9712XW", customer: "Aïssatou Ba",   phone: "+221 77 111 22 33", soldAt: "2025-12-01", expiresAt: "2027-12-01", status: "claim" },
];

export interface ProInvoice {
  id: string;
  number: string;
  type: "Proforma" | "Facture" | "Bon de livraison" | "Reçu";
  customer: string;
  total: number;
  date: string;
  status: "draft" | "sent" | "paid";
}
export const proInvoices: ProInvoice[] = [
  { id: "pi1", number: "PRO-2026-0014", type: "Proforma",         customer: "Hôtel Téranga",     total: 4_850_000, date: "2026-06-04", status: "sent" },
  { id: "pi2", number: "FAC-2026-0211", type: "Facture",          customer: "École Les Pédagogues", total: 2_120_000, date: "2026-06-03", status: "paid" },
  { id: "pi3", number: "BL-2026-0098",  type: "Bon de livraison", customer: "Clinique Pasteur",  total: 985_000,   date: "2026-06-05", status: "sent" },
  { id: "pi4", number: "REC-2026-0145", type: "Reçu",             customer: "Mme. Diallo",       total: 320_000,   date: "2026-06-06", status: "paid" },
  { id: "pi5", number: "PRO-2026-0015", type: "Proforma",         customer: "Société Plastica",  total: 6_400_000, date: "2026-06-06", status: "draft" },
];

export interface ApplianceCredit {
  id: string;
  customer: string;
  productName: string;
  total: number;
  downPayment: number;
  monthlyPayment: number;
  paidMonths: number;
  totalMonths: number;
  status: "ok" | "late";
}
export const applianceCredits: ApplianceCredit[] = [
  { id: "ac1", customer: "Aminata Diop",  productName: "LG Frigo 410L Inox",  total: 685_000, downPayment: 200_000, monthlyPayment: 60_500, paidMonths: 4, totalMonths: 8, status: "ok" },
  { id: "ac2", customer: "Mr. Sarr",       productName: "Samsung TV QLED 55\"", total: 520_000, downPayment: 150_000, monthlyPayment: 46_300, paidMonths: 2, totalMonths: 8, status: "late" },
  { id: "ac3", customer: "Famille Ndiaye", productName: "Beko Lave-linge 9kg", total: 320_000, downPayment: 80_000,  monthlyPayment: 30_000, paidMonths: 5, totalMonths: 8, status: "ok" },
];
