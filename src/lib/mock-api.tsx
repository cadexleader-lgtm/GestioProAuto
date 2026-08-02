/**
 * Data access layer for the commerce & restaurant modules.
 * Reads and writes go through the tenant-scoped Supabase store (`db`),
 * so every hook returns the signed-in company's real data.
 * The hook names are kept stable for the existing pages.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, useCollection } from "./demo-store";
import {
  type Product, type Customer, type Sale, type SaleItem,
  type Dish, type RestaurantTable, type RestaurantOrder, type OrderItem, type OrderStatus,
} from "./commerce-data";
import { getTenant, updateCompany as persistCompany } from "./tenant";

export type { Product, Customer, Sale, SaleItem, Dish, RestaurantTable, RestaurantOrder, OrderItem, OrderStatus };
export type GetReportSummaryPeriod = "day" | "week" | "month";

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

const sectors: Sector[] = [
  { id: "commerce", name: "Commerce", icon: "🛍️", description: "Boutique, magasin, électroménager" },
  { id: "automobile", name: "Automobile", icon: "🚗", description: "Vente, location, crédit véhicules" },
  { id: "restaurant", name: "Restaurant & Bar", icon: "🍽️", description: "Tables, cuisine, serveurs" },
];

// ---------- Query keys ----------
export const getGetCompanyQueryKey = () => ["company"] as const;
export const getGetDashboardQueryKey = () => ["dashboard"] as const;
export const getListProductsQueryKey = () => ["products"] as const;
export const getListCustomersQueryKey = () => ["customers"] as const;
export const getListSalesQueryKey = () => ["sales"] as const;
export const getListDishesQueryKey = () => ["dishes"] as const;
export const getListTablesQueryKey = () => ["resto-tables"] as const;
export const getListOrdersQueryKey = () => ["resto-orders"] as const;
export const getRestoDashboardQueryKey = () => ["resto-dashboard"] as const;

function currentCompany(): Company {
  const t = getTenant();
  return {
    id: t.company?.id ?? "",
    name: t.company?.name ?? "Mon entreprise",
    ownerName: t.email?.split("@")[0] ?? "",
    email: t.email ?? "",
    phone: t.company?.phone ?? undefined,
    country: "Sénégal",
    city: t.company?.address ?? "",
    currency: t.company?.currency ?? "XOF",
    sectorId: t.company?.sector,
    subSectorId: t.company?.sub_sector ?? undefined,
  };
}

// ---------- Company ----------
export function useGetCompany() {
  const t = getTenant();
  return useQuery({
    queryKey: [...getGetCompanyQueryKey(), t.company?.id ?? "none"],
    queryFn: async () => currentCompany(),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Company> }) => {
      await persistCompany({
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.city !== undefined ? { address: data.city ?? null } : {}),
        ...(data.sectorId ? { sector: data.sectorId } : {}),
        ...(data.subSectorId !== undefined ? { sub_sector: data.subSectorId ?? null } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
      });
      return currentCompany();
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useListSectors() {
  return useQuery({ queryKey: ["sectors"], queryFn: async () => sectors });
}

// ---------- Products ----------
export function useListProducts(params?: { search?: string; lowStockOnly?: boolean }) {
  const items = useCollection("products");
  return useQuery({
    queryKey: [...getListProductsQueryKey(), params?.search ?? "", !!params?.lowStockOnly, items.length, items],
    queryFn: async () => {
      let result = items.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
      }
      if (params?.lowStockOnly) result = result.filter((p) => p.stock <= p.lowStockThreshold);
      return result;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Omit<Product, "id" | "createdAt"> & { createdAt?: string } }) =>
      db.add("products", { ...data, createdAt: data.createdAt ?? new Date().toISOString() } as Omit<Product, "id">),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => db.update("products", id, data),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      db.remove("products", id);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- Customers ----------
export function useListCustomers(params?: { search?: string }) {
  const items = useCollection("customers");
  return useQuery({
    queryKey: [...getListCustomersQueryKey(), params?.search ?? "", items.length, items],
    queryFn: async () => {
      let result = items.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter(
          (c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q),
        );
      }
      return result;
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Omit<Customer, "id" | "createdAt"> & { createdAt?: string } }) =>
      db.add("customers", { ...data, createdAt: data.createdAt ?? new Date().toISOString() } as Omit<Customer, "id">),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      db.remove("customers", id);
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- Sales ----------
export function useListSales() {
  const items = useCollection("sales");
  return useQuery({
    queryKey: [...getListSalesQueryKey(), items.length, items],
    queryFn: async () => items.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: {
        customerId?: string;
        paymentMethod: string;
        sellerName?: string;
        items: { productId: string; quantity: number; unitPriceOverride?: number }[];
      };
    }) => {
      const products = db.list("products");
      let total = 0;
      const items: SaleItem[] = data.items.map((it) => {
        const p = products.find((pp) => pp.id === it.productId);
        const unitPrice = it.unitPriceOverride ?? p?.price ?? 0;
        total += unitPrice * it.quantity;
        if (p) db.update("products", p.id, { stock: Math.max(0, p.stock - it.quantity) } as Partial<Product>);
        return { productId: it.productId, productName: p?.name ?? "Produit", quantity: it.quantity, unitPrice };
      });
      const count = db.list("sales").length;
      const sale = db.add("sales", {
        reference: `INV-${String(2401 + count).padStart(4, "0")}`,
        total,
        paymentMethod: data.paymentMethod,
        sellerName: data.sellerName || currentCompany().ownerName,
        customerId: data.customerId,
        createdAt: new Date().toISOString(),
        items,
      } as Omit<Sale, "id">);
      // Encaissement en trésorerie
      db.add("cash", {
        date: new Date().toISOString().slice(0, 10),
        type: "in",
        label: `Vente ${sale.reference}`,
        amount: total,
        method: data.paymentMethod,
      } as any);
      return sale;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- Dashboard ----------
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
  const sales = useCollection("sales");
  const products = useCollection("products");
  return useQuery({
    queryKey: [...getGetDashboardQueryKey(), sales, products],
    queryFn: async (): Promise<Dashboard> => {
      const sorted = sales.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todaySales = sorted.filter((s) => new Date(s.createdAt) >= today);
      const ySales = sorted.filter((s) => new Date(s.createdAt) >= yesterday && new Date(s.createdAt) < today);
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
      const yRevenue = ySales.reduce((sum, s) => sum + s.total, 0);

      // Marge à partir du coût réel des produits vendus
      let cost = 0;
      todaySales.forEach((s) =>
        (s.items ?? []).forEach((it) => {
          const p = products.find((pp) => pp.id === it.productId);
          cost += (p?.cost ?? 0) * it.quantity;
        }),
      );
      const marginPct = todayRevenue > 0 ? ((todayRevenue - cost) / todayRevenue) * 100 : 0;

      const weekSeries = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const revenue = sorted
          .filter((s) => new Date(s.createdAt) >= d && new Date(s.createdAt) < next)
          .reduce((sum, s) => sum + s.total, 0);
        return { date: d.toISOString(), revenue };
      });

      return {
        todaySalesCount: todaySales.length,
        todayRevenue,
        todayMarginPct: Math.round(marginPct * 10) / 10,
        salesDeltaPct: ySales.length ? Math.round(((todaySales.length - ySales.length) / ySales.length) * 100) : 0,
        revenueDeltaPct: yRevenue ? Math.round(((todayRevenue - yRevenue) / yRevenue) * 100) : 0,
        lowStock: products
          .filter((p) => p.stock <= p.lowStockThreshold)
          .map((p) => ({ productId: p.id, productName: p.name, stock: p.stock, unit: p.unit, lowStockThreshold: p.lowStockThreshold })),
        weekSeries,
        recentSales: sorted.slice(0, 6),
      };
    },
  });
}

export function useGetReportSummary(params: { period: GetReportSummaryPeriod }) {
  const sales = useCollection("sales");
  const products = useCollection("products");
  return useQuery({
    queryKey: ["report", params.period, sales, products],
    queryFn: async () => {
      const points = params.period === "day" ? 12 : params.period === "week" ? 7 : 30;
      const costOf = (it: SaleItem) => (products.find((p) => p.id === it.productId)?.cost ?? 0) * it.quantity;

      const series = Array.from({ length: points }).map((_, i) => {
        const start = new Date();
        if (params.period === "day") {
          start.setHours(start.getHours() - (points - 1 - i), 0, 0, 0);
        } else {
          start.setDate(start.getDate() - (points - 1 - i));
          start.setHours(0, 0, 0, 0);
        }
        const end = new Date(start);
        if (params.period === "day") end.setHours(end.getHours() + 1);
        else end.setDate(end.getDate() + 1);

        const bucket = sales.filter((s) => new Date(s.createdAt) >= start && new Date(s.createdAt) < end);
        const revenue = bucket.reduce((sum, s) => sum + s.total, 0);
        const cost = bucket.reduce((sum, s) => sum + (s.items ?? []).reduce((c, it) => c + costOf(it), 0), 0);
        return { date: start.toISOString(), revenue, profit: Math.max(0, revenue - cost) };
      });

      const sold = new Map<string, { name: string; quantity: number; revenue: number }>();
      sales.forEach((s) =>
        (s.items ?? []).forEach((it) => {
          const cur = sold.get(it.productId) ?? { name: it.productName, quantity: 0, revenue: 0 };
          cur.quantity += it.quantity;
          cur.revenue += it.unitPrice * it.quantity;
          sold.set(it.productId, cur);
        }),
      );

      return {
        totalRevenue: series.reduce((s, p) => s + p.revenue, 0),
        totalProfit: series.reduce((s, p) => s + p.profit, 0),
        totalSales: sales.length,
        series,
        topProducts: Array.from(sold.entries())
          .map(([productId, v]) => ({ productId, productName: v.name, quantitySold: v.quantity, revenue: v.revenue }))
          .sort((a, b) => b.quantitySold - a.quantitySold)
          .slice(0, 5),
      };
    },
  });
}

// =============================================================
// ===================== RESTAURANT MODULE =====================
// =============================================================

export function useListDishes(params?: { search?: string; category?: string }) {
  const dishes = useCollection("dishes");
  return useQuery({
    queryKey: [...getListDishesQueryKey(), params?.search ?? "", params?.category ?? "", dishes],
    queryFn: async () => {
      let result = dishes.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter((d) => d.name.toLowerCase().includes(q));
      }
      if (params?.category && params.category !== "all") result = result.filter((d) => d.category === params.category);
      return result;
    },
  });
}

export function useToggleDishAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const d = db.list("dishes").find((x) => x.id === id);
      return d ? db.update("dishes", id, { available: !d.available } as Partial<Dish>) : null;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useListRestaurantTables() {
  const tables = useCollection("restoTables");
  return useQuery({
    queryKey: [...getListTablesQueryKey(), tables],
    queryFn: async () => tables.slice().sort((a, b) => a.number - b.number),
  });
}

export function useUpdateTableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RestaurantTable["status"] }) =>
      db.update("restoTables", id, { status } as Partial<RestaurantTable>),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useListOrders(params?: { status?: OrderStatus | "active" | "all" }) {
  const orders = useCollection("orders");
  return useQuery({
    queryKey: [...getListOrdersQueryKey(), params?.status ?? "all", orders],
    queryFn: async () => {
      let result = orders.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      if (params?.status === "active") result = result.filter((o) => o.status !== "paid");
      else if (params?.status && params.status !== "all") result = result.filter((o) => o.status === params.status);
      return result;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { tableNumber: number; server: string; items: { dishId: string; quantity: number; note?: string }[] };
    }) => {
      const dishes = db.list("dishes");
      const items: OrderItem[] = data.items.map((it) => {
        const d = dishes.find((x) => x.id === it.dishId);
        return { dishId: it.dishId, dishName: d?.name ?? "Plat", quantity: it.quantity, unitPrice: d?.price ?? 0, note: it.note };
      });
      const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
      const count = db.list("orders").length;
      const order = db.add("orders", {
        reference: `CMD-${String(1201 + count).padStart(4, "0")}`,
        tableNumber: data.tableNumber,
        server: data.server,
        items,
        total,
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Omit<RestaurantOrder, "id">);
      const t = db.list("restoTables").find((x) => x.number === data.tableNumber);
      if (t) db.update("restoTables", t.id, { status: "occupied" } as Partial<RestaurantTable>);
      return order;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const order = db.list("orders").find((x) => x.id === id);
      const updated = db.update("orders", id, { status, updatedAt: new Date().toISOString() } as Partial<RestaurantOrder>);
      if (status === "paid" && order) {
        const t = db.list("restoTables").find((x) => x.number === order.tableNumber);
        if (t) db.update("restoTables", t.id, { status: "free" } as Partial<RestaurantTable>);
        db.add("cash", {
          date: new Date().toISOString().slice(0, 10),
          type: "in",
          label: `Commande ${order.reference} — Table ${order.tableNumber}`,
          amount: order.total,
          method: "Espèces",
        } as any);
      }
      return updated;
    },
    onSuccess: () => qc.invalidateQueries(),
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
  const orders = useCollection("orders");
  const tables = useCollection("restoTables");
  const dishes = useCollection("dishes");
  return useQuery({
    queryKey: [...getRestoDashboardQueryKey(), orders, tables],
    queryFn: async (): Promise<RestaurantDashboardData> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
      const revenueToday = todayOrders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

      const byStatus: Record<OrderStatus, number> = { new: 0, cooking: 0, ready: 0, served: 0, paid: 0 };
      orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

      const dishCount = new Map<string, { quantity: number; revenue: number; name: string }>();
      orders.forEach((o) =>
        o.items.forEach((it) => {
          const cur = dishCount.get(it.dishId) ?? { quantity: 0, revenue: 0, name: it.dishName };
          cur.quantity += it.quantity;
          cur.revenue += it.unitPrice * it.quantity;
          dishCount.set(it.dishId, cur);
        }),
      );

      const hourlyRevenue = Array.from({ length: 12 }).map((_, i) => {
        const h = 10 + i;
        const revenue = todayOrders
          .filter((o) => o.status === "paid" && new Date(o.createdAt).getHours() === h)
          .reduce((s, o) => s + o.total, 0);
        return { hour: `${h}h`, revenue };
      });

      const prepDishes = dishes.filter((d) => d.available);
      const avgPrep = prepDishes.length
        ? Math.round(prepDishes.reduce((s, d) => s + d.prepMinutes, 0) / prepDishes.length)
        : 0;

      return {
        ordersToday: todayOrders.length,
        revenueToday,
        avgPrepMinutes: avgPrep,
        occupiedTables: tables.filter((t) => t.status === "occupied").length,
        totalTables: tables.length,
        ordersByStatus: byStatus,
        hourlyRevenue,
        topDishes: Array.from(dishCount.entries())
          .map(([dishId, v]) => ({ dishId, dishName: v.name, quantity: v.quantity, revenue: v.revenue }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5),
        activeOrders: orders.filter((o) => o.status !== "paid").slice(0, 8),
      };
    },
  });
}
