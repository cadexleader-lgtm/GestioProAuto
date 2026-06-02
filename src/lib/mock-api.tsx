/**
 * Mock implementation of @workspace/api-client-react.
 * Provides realistic in-memory data so the UI runs without a backend.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type GetReportSummaryPeriod = "day" | "week" | "month";

// ---------- Types ----------
export interface Company {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  country: string;
  city: string;
  currency: string;
  sectorId?: string;
  subSectorId?: string;
}

export interface Sector {
  id: string;
  name: string;
  icon: string;
  description: string;
}

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
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
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
  createdAt: string;
  items?: SaleItem[];
}

// ---------- Persisted sector (localStorage) ----------
const SECTOR_LS_KEY = "gestiopro.sector";
const SUBSECTOR_LS_KEY = "gestiopro.subSector";
const COMPANY_LS_KEY = "gestiopro.company";

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeLS(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch {}
}

const persistedCompany = (() => {
  const raw = readLS(COMPANY_LS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Partial<Company>; } catch { return null; }
})();

// ---------- Seed data ----------
const company: Company = {
  id: "co_1",
  name: persistedCompany?.name ?? "Boutique Sankara",
  ownerName: persistedCompany?.ownerName ?? "Aminata Sankara",
  email: persistedCompany?.email ?? "aminata@sankara.shop",
  phone: persistedCompany?.phone ?? "+221 77 555 12 34",
  country: persistedCompany?.country ?? "Sénégal",
  city: persistedCompany?.city ?? "Dakar",
  currency: "XOF",
  sectorId: readLS(SECTOR_LS_KEY) ?? persistedCompany?.sectorId ?? "commerce",
  subSectorId: readLS(SUBSECTOR_LS_KEY) ?? undefined,
};

const sectors: Sector[] = [
  { id: "sec_shop", name: "Boutique", icon: "🛍️", description: "Commerce général, mode, électronique" },
  { id: "sec_resto", name: "Restaurant", icon: "🍽️", description: "Tables, cuisine, serveurs" },
  { id: "sec_super", name: "Supermarché", icon: "🛒", description: "Caisses multiples, rayons" },
  { id: "sec_phone", name: "Téléphonie", icon: "📱", description: "Vente et réparation mobile" },
  { id: "sec_assur", name: "Assurance", icon: "🛡️", description: "Contrats, sinistres, paiements" },
  { id: "sec_clinic", name: "Clinique", icon: "🏥", description: "Patients, consultations, dossiers" },
  { id: "sec_school", name: "École", icon: "🎓", description: "Élèves, scolarité, paiements" },
  { id: "sec_service", name: "Services", icon: "🧰", description: "Prestations, devis, factures" },
];

const products: Product[] = [
  { id: "p1", name: "T-shirt premium", sku: "TSH-001", category: "Vêtements", unit: "pcs", price: 7500, cost: 3200, stock: 42, lowStockThreshold: 10, createdAt: new Date().toISOString() },
  { id: "p2", name: "Jean slim bleu", sku: "JEN-014", category: "Vêtements", unit: "pcs", price: 18000, cost: 9000, stock: 7, lowStockThreshold: 10, createdAt: new Date().toISOString() },
  { id: "p3", name: "Sneakers urbain", sku: "SNK-220", category: "Chaussures", unit: "paires", price: 32000, cost: 19000, stock: 3, lowStockThreshold: 5, createdAt: new Date().toISOString() },
  { id: "p4", name: "Casquette logo", sku: "CAP-007", category: "Accessoires", unit: "pcs", price: 4500, cost: 1800, stock: 60, lowStockThreshold: 15, createdAt: new Date().toISOString() },
  { id: "p5", name: "Sac à dos cuir", sku: "BAG-101", category: "Accessoires", unit: "pcs", price: 28000, cost: 14000, stock: 14, lowStockThreshold: 5, createdAt: new Date().toISOString() },
  { id: "p6", name: "Montre classique", sku: "WCH-450", category: "Accessoires", unit: "pcs", price: 45000, cost: 22000, stock: 2, lowStockThreshold: 4, createdAt: new Date().toISOString() },
];

const customers: Customer[] = [
  { id: "c1", name: "Moussa Diop", phone: "+221 77 123 45 67", email: "moussa@example.com", createdAt: "2025-11-12T10:00:00Z" },
  { id: "c2", name: "Fatou Ndiaye", phone: "+221 78 987 65 43", createdAt: "2025-12-01T10:00:00Z" },
  { id: "c3", name: "Ibrahim Cissé", phone: "+221 76 222 11 00", email: "ibrahim@example.com", createdAt: "2026-01-08T10:00:00Z" },
  { id: "c4", name: "Aïssatou Ba", createdAt: "2026-03-22T10:00:00Z" },
  { id: "c5", name: "Ousmane Fall", phone: "+221 77 555 44 33", createdAt: "2026-05-15T10:00:00Z" },
];

const now = Date.now();
const sales: Sale[] = Array.from({ length: 22 }).map((_, i) => {
  const total = Math.round(5000 + Math.random() * 60000);
  return {
    id: `s${i + 1}`,
    reference: `INV-${String(2401 + i).padStart(4, "0")}`,
    total,
    paymentMethod: ["Espèces", "Wave", "Orange Money", "Carte"][i % 4],
    sellerName: ["Aminata", "Moussa", "Fatou"][i % 3],
    createdAt: new Date(now - i * 1000 * 60 * 60 * 4).toISOString(),
    items: [
      { productId: "p1", productName: "T-shirt premium", quantity: 1 + (i % 3), unitPrice: 7500 },
      { productId: "p4", productName: "Casquette logo", quantity: 1, unitPrice: 4500 },
    ],
  };
});

// ---------- Query keys ----------
export const getGetCompanyQueryKey = () => ["company"] as const;
export const getGetDashboardQueryKey = () => ["dashboard"] as const;
export const getListProductsQueryKey = () => ["products"] as const;
export const getListCustomersQueryKey = () => ["customers"] as const;
export const getListSalesQueryKey = () => ["sales"] as const;

// ---------- Helpers ----------
const delay = <T,>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms));

// ---------- Hooks ----------
export function useGetCompany() {
  return useQuery({ queryKey: getGetCompanyQueryKey(), queryFn: () => delay(company) });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Company> }) => {
      Object.assign(company, data);
      if (data.sectorId) writeLS(SECTOR_LS_KEY, data.sectorId);
      if (data.subSectorId) writeLS(SUBSECTOR_LS_KEY, data.subSectorId);
      writeLS(COMPANY_LS_KEY, JSON.stringify(company));
      return delay(company);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useListSectors() {
  return useQuery({ queryKey: ["sectors"], queryFn: () => delay(sectors) });
}

export function useListProducts(params?: { search?: string; lowStockOnly?: boolean }) {
  return useQuery({
    queryKey: [...getListProductsQueryKey(), params?.search ?? "", !!params?.lowStockOnly],
    queryFn: () => {
      let result = products.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
      }
      if (params?.lowStockOnly) result = result.filter((p) => p.stock <= p.lowStockThreshold);
      return delay(result);
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Omit<Product, "id" | "createdAt"> }) => {
      const p: Product = { ...data, id: `p${products.length + 1}`, createdAt: new Date().toISOString() };
      products.unshift(p);
      return delay(p);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const idx = products.findIndex((p) => p.id === id);
      if (idx >= 0) products[idx] = { ...products[idx], ...data };
      return delay(products[idx]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const idx = products.findIndex((p) => p.id === id);
      if (idx >= 0) products.splice(idx, 1);
      return delay({ ok: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
  });
}

export function useListCustomers(params?: { search?: string }) {
  return useQuery({
    queryKey: [...getListCustomersQueryKey(), params?.search ?? ""],
    queryFn: () => {
      let result = customers.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q));
      }
      return delay(result);
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Omit<Customer, "id" | "createdAt"> }) => {
      const c: Customer = { ...data, id: `c${customers.length + 1}`, createdAt: new Date().toISOString() };
      customers.unshift(c);
      return delay(c);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const idx = customers.findIndex((c) => c.id === id);
      if (idx >= 0) customers.splice(idx, 1);
      return delay({ ok: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
  });
}

export function useListSales() {
  return useQuery({ queryKey: getListSalesQueryKey(), queryFn: () => delay(sales) });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: { customerId?: string; paymentMethod: string; sellerName?: string; items: { productId: string; quantity: number; unitPriceOverride?: number }[] } }) => {
      let total = 0;
      const items: SaleItem[] = data.items.map((it) => {
        const p = products.find((pp) => pp.id === it.productId)!;
        const unitPrice = it.unitPriceOverride ?? p.price;
        total += unitPrice * it.quantity;
        p.stock = Math.max(0, p.stock - it.quantity);
        return { productId: p.id, productName: p.name, quantity: it.quantity, unitPrice };
      });
      const s: Sale = {
        id: `s${sales.length + 1}`,
        reference: `INV-${String(2401 + sales.length).padStart(4, "0")}`,
        total,
        paymentMethod: data.paymentMethod,
        sellerName: data.sellerName || company.ownerName.split(" ")[0],
        createdAt: new Date().toISOString(),
        items,
      };
      sales.unshift(s);
      return delay(s);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListSalesQueryKey() });
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    },
  });
}

export interface Dashboard {
  todaySalesCount: number;
  todayRevenue: number;
  todayMarginPct: number;
  salesDeltaPct: number;
  revenueDeltaPct: number;
  lowStock: { productId: string; productName: string; stock: number; unit: string; lowStockThreshold: number }[];
  weekSeries: { date: string; revenue: number }[];
  recentSales: Sale[];
}

export function useGetDashboard() {
  return useQuery({
    queryKey: getGetDashboardQueryKey(),
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales.filter((s) => new Date(s.createdAt) >= today);
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
      const weekSeries = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const rev = sales
          .filter((s) => new Date(s.createdAt) >= d && new Date(s.createdAt) < next)
          .reduce((sum, s) => sum + s.total, 0);
        return { date: d.toISOString(), revenue: rev || Math.round(20000 + Math.random() * 80000) };
      });
      const dashboard: Dashboard = {
        todaySalesCount: todaySales.length || 6,
        todayRevenue: todayRevenue || 184500,
        todayMarginPct: 38.4,
        salesDeltaPct: 12,
        revenueDeltaPct: 8,
        lowStock: products
          .filter((p) => p.stock <= p.lowStockThreshold)
          .map((p) => ({ productId: p.id, productName: p.name, stock: p.stock, unit: p.unit, lowStockThreshold: p.lowStockThreshold })),
        weekSeries,
        recentSales: sales.slice(0, 6),
      };
      return delay(dashboard);
    },
  });
}

export function useGetReportSummary(params: { period: GetReportSummaryPeriod }) {
  return useQuery({
    queryKey: ["report", params.period],
    queryFn: async () => {
      const points = params.period === "day" ? 12 : params.period === "week" ? 7 : 30;
      const series = Array.from({ length: points }).map((_, i) => {
        const d = new Date();
        if (params.period === "day") d.setHours(d.getHours() - (points - 1 - i));
        else d.setDate(d.getDate() - (points - 1 - i));
        const revenue = Math.round(30000 + Math.random() * 90000);
        return { date: d.toISOString(), revenue, profit: Math.round(revenue * (0.32 + Math.random() * 0.12)) };
      });
      const totalRevenue = series.reduce((s, p) => s + p.revenue, 0);
      const totalProfit = series.reduce((s, p) => s + p.profit, 0);
      return delay({
        totalRevenue,
        totalProfit,
        totalSales: points * 4,
        series,
        topProducts: products.slice(0, 5).map((p, idx) => ({
          productId: p.id,
          productName: p.name,
          quantitySold: 80 - idx * 12,
          revenue: (80 - idx * 12) * p.price,
        })),
      });
    },
  });
}

// =============================================================
// ============== RESTAURANT MODULE (mock data) ================
// =============================================================

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

const dishes: Dish[] = [
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

const tables: RestaurantTable[] = Array.from({ length: 12 }).map((_, i) => {
  const n = i + 1;
  const statuses: RestaurantTable["status"][] = ["free", "occupied", "free", "reserved", "occupied", "free"];
  return {
    id: `t${n}`,
    number: n,
    seats: [2, 4, 4, 6, 2, 4][i % 6],
    status: statuses[i % statuses.length],
    qrCode: `gestiopro://table/${n}`,
  };
});

const orders: RestaurantOrder[] = (() => {
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
      const d = dishes.find((x) => x.id === id)!;
      return { dishId: d.id, dishName: d.name, quantity: qty, unitPrice: d.price };
    });
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    return {
      id: `o${i + 1}`,
      reference: `CMD-${String(1201 + i).padStart(4, "0")}`,
      tableNumber: tables[(i * 3) % tables.length].number,
      server: s.server,
      items,
      total,
      status: s.status,
      createdAt: new Date(now - s.t * 60_000).toISOString(),
      updatedAt: new Date(now - s.t * 60_000 + 2 * 60_000).toISOString(),
    };
  });
})();

export const getListDishesQueryKey = () => ["dishes"] as const;
export const getListTablesQueryKey = () => ["resto-tables"] as const;
export const getListOrdersQueryKey = () => ["resto-orders"] as const;
export const getRestoDashboardQueryKey = () => ["resto-dashboard"] as const;

export function useListDishes(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: [...getListDishesQueryKey(), params?.search ?? "", params?.category ?? ""],
    queryFn: () => {
      let result = dishes.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter((d) => d.name.toLowerCase().includes(q));
      }
      if (params?.category && params.category !== "all") {
        result = result.filter((d) => d.category === params.category);
      }
      return delay(result);
    },
  });
}

export function useToggleDishAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const d = dishes.find((x) => x.id === id);
      if (d) d.available = !d.available;
      return delay(d);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListDishesQueryKey() }),
  });
}

export function useListRestaurantTables() {
  return useQuery({ queryKey: getListTablesQueryKey(), queryFn: () => delay(tables) });
}

export function useUpdateTableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RestaurantTable["status"] }) => {
      const t = tables.find((x) => x.id === id);
      if (t) t.status = status;
      return delay(t);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getListTablesQueryKey() }),
  });
}

export function useListOrders(params?: { status?: OrderStatus | "active" | "all" }) {
  return useQuery({
    queryKey: [...getListOrdersQueryKey(), params?.status ?? "all"],
    queryFn: () => {
      let result = orders.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      if (params?.status === "active") {
        result = result.filter((o) => o.status !== "paid");
      } else if (params?.status && params.status !== "all") {
        result = result.filter((o) => o.status === params.status);
      }
      return delay(result);
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: { tableNumber: number; server: string; items: { dishId: string; quantity: number; note?: string }[] } }) => {
      const items: OrderItem[] = data.items.map((it) => {
        const d = dishes.find((x) => x.id === it.dishId)!;
        return { dishId: d.id, dishName: d.name, quantity: it.quantity, unitPrice: d.price, note: it.note };
      });
      const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
      const o: RestaurantOrder = {
        id: `o${orders.length + 1}`,
        reference: `CMD-${String(1201 + orders.length).padStart(4, "0")}`,
        tableNumber: data.tableNumber,
        server: data.server,
        items,
        total,
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      orders.unshift(o);
      const t = tables.find((x) => x.number === data.tableNumber);
      if (t) t.status = "occupied";
      return delay(o);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
      qc.invalidateQueries({ queryKey: getRestoDashboardQueryKey() });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const o = orders.find((x) => x.id === id);
      if (o) {
        o.status = status;
        o.updatedAt = new Date().toISOString();
        if (status === "paid") {
          const t = tables.find((x) => x.number === o.tableNumber);
          if (t) t.status = "free";
        }
      }
      return delay(o);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getListTablesQueryKey() });
      qc.invalidateQueries({ queryKey: getRestoDashboardQueryKey() });
    },
  });
}

export interface RestaurantDashboardData {
  ordersToday: number;
  revenueToday: number;
  avgPrepMinutes: number;
  occupiedTables: number;
  totalTables: number;
  ordersByStatus: Record<OrderStatus, number>;
  hourlyRevenue: { hour: string; revenue: number }[];
  topDishes: { dishId: string; dishName: string; quantity: number; revenue: number }[];
  activeOrders: RestaurantOrder[];
}

export function useGetRestaurantDashboard() {
  return useQuery({
    queryKey: getRestoDashboardQueryKey(),
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
      const revenueToday = todayOrders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);
      const byStatus: Record<OrderStatus, number> = { new: 0, cooking: 0, ready: 0, served: 0, paid: 0 };
      orders.forEach((o) => { byStatus[o.status]++; });
      const dishCount = new Map<string, { quantity: number; revenue: number; name: string }>();
      orders.forEach((o) =>
        o.items.forEach((it) => {
          const cur = dishCount.get(it.dishId) ?? { quantity: 0, revenue: 0, name: it.dishName };
          cur.quantity += it.quantity;
          cur.revenue += it.unitPrice * it.quantity;
          dishCount.set(it.dishId, cur);
        }),
      );
      const topDishes = Array.from(dishCount.entries())
        .map(([dishId, v]) => ({ dishId, dishName: v.name, quantity: v.quantity, revenue: v.revenue }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      const hourlyRevenue = Array.from({ length: 12 }).map((_, i) => {
        const h = 10 + i;
        return { hour: `${h}h`, revenue: Math.round(8000 + Math.random() * 45000) };
      });
      const data: RestaurantDashboardData = {
        ordersToday: todayOrders.length || 24,
        revenueToday: revenueToday || 156800,
        avgPrepMinutes: 18,
        occupiedTables: tables.filter((t) => t.status === "occupied").length,
        totalTables: tables.length,
        ordersByStatus: byStatus,
        hourlyRevenue,
        topDishes,
        activeOrders: orders.filter((o) => o.status !== "paid").slice(0, 8),
      };
      return delay(data);
    },
  });
}
export const __mockApiReady = true;
export const _ = useEffect;
export const __ = useState;
