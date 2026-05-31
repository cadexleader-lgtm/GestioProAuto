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
  sectorId: string | null;
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

// ---------- Seed data ----------
const company: Company = {
  id: "co_1",
  name: "Boutique Sankara",
  ownerName: "Aminata Sankara",
  email: "aminata@sankara.shop",
  phone: "+221 77 555 12 34",
  country: "Sénégal",
  city: "Dakar",
  currency: "XOF",
  sectorId: "sec_shop",
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
    mutationFn: async (data: Partial<Company>) => {
      Object.assign(company, data);
      return delay(company);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetCompanyQueryKey() }),
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
    mutationFn: async (data: Omit<Product, "id" | "createdAt">) => {
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
    mutationFn: async (id: string) => {
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
    mutationFn: async (data: Omit<Customer, "id" | "createdAt">) => {
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
    mutationFn: async (id: string) => {
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
    mutationFn: async (data: { customerId?: string; paymentMethod: string; items: { productId: string; quantity: number; unitPriceOverride?: number }[] }) => {
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
        sellerName: company.ownerName.split(" ")[0],
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

// no-op export to keep tooling happy
export const __mockApiReady = true;
export const _ = useEffect;
export const __ = useState;
