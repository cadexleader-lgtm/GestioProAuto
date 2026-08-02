/**
 * Commerce + Restaurant entity types and demo seeds.
 * Kept separate from the API layer so the persistence store can import them
 * without creating a circular dependency.
 */

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  createdAt: string;
  attributes?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  reference: string;
  total: number;
  paymentMethod: string;
  sellerName: string;
  customerId?: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
  prepMinutes: number;
  available: boolean;
  emoji: string;
  description?: string;
}

export interface RestaurantTable {
  id: string;
  number: number;
  seats: number;
  status: "free" | "occupied" | "reserved";
  qrCode: string;
}

export type OrderStatus = "new" | "cooking" | "ready" | "served" | "paid";

export interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface RestaurantOrder {
  id: string;
  reference: string;
  tableNumber: number;
  server: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedDocument {
  id: string;
  type: string;
  reference: string;
  title: string;
  relatedTo?: string;
  amount?: number;
  createdAt: string;
  dataUrl?: string;
}

const iso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
};

export const seedProducts: Product[] = [
  { id: "p1", name: "T-shirt premium", sku: "TSH-001", category: "Vêtements", unit: "pcs", price: 7500, cost: 3200, stock: 42, lowStockThreshold: 10, createdAt: iso(30) },
  { id: "p2", name: "Jean slim bleu", sku: "JEN-014", category: "Vêtements", unit: "pcs", price: 18000, cost: 9000, stock: 7, lowStockThreshold: 10, createdAt: iso(28) },
  { id: "p3", name: "Sneakers urbain", sku: "SNK-220", category: "Chaussures", unit: "paires", price: 32000, cost: 19000, stock: 3, lowStockThreshold: 5, createdAt: iso(20) },
  { id: "p4", name: "Casquette logo", sku: "CAP-007", category: "Accessoires", unit: "pcs", price: 4500, cost: 1800, stock: 60, lowStockThreshold: 15, createdAt: iso(18) },
  { id: "p5", name: "Sac à dos cuir", sku: "BAG-101", category: "Accessoires", unit: "pcs", price: 28000, cost: 14000, stock: 14, lowStockThreshold: 5, createdAt: iso(12) },
  { id: "p6", name: "Montre classique", sku: "WCH-450", category: "Accessoires", unit: "pcs", price: 45000, cost: 22000, stock: 2, lowStockThreshold: 4, createdAt: iso(5) },
];

export const seedCustomers: Customer[] = [
  { id: "c1", name: "Moussa Diop", phone: "+221 77 123 45 67", email: "moussa@example.com", createdAt: iso(120) },
  { id: "c2", name: "Fatou Ndiaye", phone: "+221 78 987 65 43", createdAt: iso(90) },
  { id: "c3", name: "Ibrahim Cissé", phone: "+221 76 222 11 00", email: "ibrahim@example.com", createdAt: iso(60) },
  { id: "c4", name: "Aïssatou Ba", createdAt: iso(40) },
  { id: "c5", name: "Ousmane Fall", phone: "+221 77 555 44 33", createdAt: iso(15) },
];

export const seedSales: Sale[] = Array.from({ length: 22 }).map((_, i) => ({
  id: `s${i + 1}`,
  reference: `INV-${String(2401 + i).padStart(4, "0")}`,
  total: 5000 + ((i * 7919) % 60000),
  paymentMethod: ["Espèces", "Wave", "Orange Money", "Carte"][i % 4],
  sellerName: ["Aminata", "Moussa", "Fatou"][i % 3],
  createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 4).toISOString(),
  items: [
    { productId: "p1", productName: "T-shirt premium", quantity: 1 + (i % 3), unitPrice: 7500 },
    { productId: "p4", productName: "Casquette logo", quantity: 1, unitPrice: 4500 },
  ],
}));

export const seedDishes: Dish[] = [
  { id: "d1", name: "Thiéboudienne", category: "Plats", price: 3500, prepMinutes: 25, available: true, emoji: "🍚", description: "Riz au poisson, légumes du jour" },
  { id: "d2", name: "Yassa poulet", category: "Plats", price: 3000, prepMinutes: 20, available: true, emoji: "🍗", description: "Poulet mariné aux oignons confits" },
  { id: "d3", name: "Mafé bœuf", category: "Plats", price: 3200, prepMinutes: 22, available: true, emoji: "🥘", description: "Bœuf en sauce d'arachide" },
  { id: "d4", name: "Brochettes mixtes", category: "Grillades", price: 2800, prepMinutes: 15, available: true, emoji: "🍢" },
  { id: "d5", name: "Poisson braisé", category: "Grillades", price: 4500, prepMinutes: 30, available: true, emoji: "🐟" },
  { id: "d6", name: "Salade César", category: "Entrées", price: 2200, prepMinutes: 10, available: true, emoji: "🥗" },
  { id: "d7", name: "Pastels (x4)", category: "Entrées", price: 1500, prepMinutes: 8, available: true, emoji: "🥟" },
  { id: "d8", name: "Bissap maison", category: "Boissons", price: 800, prepMinutes: 2, available: true, emoji: "🥤" },
  { id: "d9", name: "Gingembre", category: "Boissons", price: 800, prepMinutes: 2, available: true, emoji: "🧃" },
  { id: "d10", name: "Coca 33cl", category: "Boissons", price: 1000, prepMinutes: 1, available: true, emoji: "🥫" },
  { id: "d11", name: "Thiakry", category: "Desserts", price: 1200, prepMinutes: 5, available: true, emoji: "🍮" },
  { id: "d12", name: "Salade de fruits", category: "Desserts", price: 1500, prepMinutes: 5, available: false, emoji: "🍓" },
];

export const seedTables: RestaurantTable[] = Array.from({ length: 12 }).map((_, i) => {
  const n = i + 1;
  const statuses: RestaurantTable["status"][] = ["free", "occupied", "free", "reserved", "occupied", "free"];
  return { id: `t${n}`, number: n, seats: [2, 4, 4, 6, 2, 4][i % 6], status: statuses[i % statuses.length], qrCode: `gestiopro://table/${n}` };
});

export const seedOrders: RestaurantOrder[] = (() => {
  const now = Date.now();
  const sample: Array<{ t: number; status: OrderStatus; items: Array<[string, number]>; server: string }> = [
    { t: 5, status: "cooking", items: [["d1", 2], ["d8", 2]], server: "Awa" },
    { t: 12, status: "new", items: [["d2", 1], ["d4", 2], ["d10", 3]], server: "Moussa" },
    { t: 18, status: "ready", items: [["d5", 1], ["d6", 1], ["d9", 1]], server: "Awa" },
    { t: 32, status: "served", items: [["d3", 2], ["d11", 2], ["d8", 2]], server: "Ibrahim" },
    { t: 45, status: "cooking", items: [["d7", 2], ["d4", 1]], server: "Moussa" },
    { t: 60, status: "paid", items: [["d1", 1], ["d10", 1]], server: "Awa" },
    { t: 90, status: "paid", items: [["d2", 2], ["d8", 2], ["d11", 2]], server: "Ibrahim" },
  ];
  return sample.map((s, i) => {
    const items: OrderItem[] = s.items.map(([id, qty]) => {
      const d = seedDishes.find((x) => x.id === id)!;
      return { dishId: d.id, dishName: d.name, quantity: qty, unitPrice: d.price };
    });
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    return {
      id: `o${i + 1}`,
      reference: `CMD-${String(1201 + i).padStart(4, "0")}`,
      tableNumber: seedTables[(i * 3) % seedTables.length].number,
      server: s.server,
      items,
      total,
      status: s.status,
      createdAt: new Date(now - s.t * 60_000).toISOString(),
      updatedAt: new Date(now - s.t * 60_000 + 2 * 60_000).toISOString(),
    };
  });
})();
