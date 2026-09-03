/**
 * Reactive localStorage-backed store for all demo entities.
 * Each "collection" is a typed array persisted under a single key.
 * Components subscribe via useCollection(name) and get instant re-renders.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  suppliers as seedSuppliers, employees as seedEmployees,
  expenses as seedExpenses, cashMovements as seedCash,
  vehicles as seedVehicles, vehicleCredits as seedVCredits, rentals as seedRentals,
  appliances as seedAppliances, warranties as seedWarranties, proInvoices as seedProInvoices, applianceCredits as seedACredits,
  type Supplier, type Employee, type Expense, type CashMovement,
  type Vehicle, type VehicleCredit, type Rental,
  type ApplianceProduct, type Warranty, type ProInvoice, type ApplianceCredit,
} from "./demo-data";
import { seedCategories, type Category } from "./categories-data";
import {
  seedProducts, seedCustomers, seedSales, seedDishes, seedTables, seedOrders,
  type Product, type Customer, type Sale, type Dish, type RestaurantTable,
  type RestaurantOrder, type ArchivedDocument,
} from "./commerce-data";
export type { Product, Customer, Sale, SaleItem, Dish, RestaurantTable, RestaurantOrder, OrderItem, OrderStatus, ArchivedDocument } from "./commerce-data";
export type { Category, ProductAttribute, AttributeType } from "./categories-data";


// ===== Extended entities =====
export interface Attendance {
  id: string;
  employeeId: string;
  date: string;          // YYYY-MM-DD
  checkIn?: string;      // HH:mm
  checkOut?: string;     // HH:mm
  status: "present" | "absent" | "leave" | "late";
  note?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;         // YYYY-MM
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advances: number;
  net: number;
  paidAt?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  tableNumber: number;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm
  guests: number;
  note?: string;
  status: "pending" | "confirmed" | "seated" | "cancelled" | "noshow";
}

export interface SerialNumber {
  id: string;
  productId: string;
  serial: string;
  status: "stock" | "sold" | "rma";
  soldTo?: string;
  soldAt?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  type: "Vidange" | "Pneus" | "Freins" | "Révision" | "Réparation" | "Autre";
  description: string;
  cost: number;
  nextDueKm?: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: "percent" | "amount" | "bogo";
  value: number;
  productIds?: string[];
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface InventoryCount {
  id: string;
  date: string;
  branch: string;
  status: "draft" | "validated";
  lines: { productId: string; productName: string; expected: number; counted: number }[];
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  motif: string;
  type: string;
  garage: string;
  priority: "low" | "medium" | "high";
  dateIn: string;
  dateOut?: string;
  status: "pending" | "diagnostic" | "repair" | "parts_wait" | "done";
  partsCost: number;
  laborCost: number;
  otherCost: number;
  notes?: string;
}

export interface VehiclePayment {
  id: string;
  creditId: string;
  amount: number;
  date: string;
  method: "Cash" | "Wave" | "Orange Money" | "Virement" | "Chèque";
  note?: string;
}

export interface VehicleSale {
  id: string;
  vehicleId: string;
  customer: string;
  phone?: string;
  address?: string;
  cin?: string;
  amount: number;
  date: string;
  payment: "cash" | "credit";
  method?: "Cash" | "Wave" | "Orange Money" | "Virement" | "Chèque";
  downPayment?: number;
  creditId?: string;
  documents?: { id: string; name: string; type: string; dataUrl: string; uploadedAt: string; size: number }[];
  delivery?: { date: string; km: number; fuelLevel: string; conditionNote?: string; signed: boolean };
  reminders?: { insuranceExpiry?: string; techControlExpiry?: string; nextDueDate?: string };
  signatures?: { client?: string; vendor?: string; signedAt?: string };
  status: "draft" | "documents" | "sale" | "payment" | "delivery" | "done";
}


export interface CompanySetting {
  id: string;
  [key: string]: any;
}

// ===== Collection registry =====
type CollectionMap = {
  suppliers: Supplier;
  employees: Employee;
  expenses: Expense;
  cash: CashMovement;
  vehicles: Vehicle;
  vehicleCredits: VehicleCredit;
  rentals: Rental;
  appliances: ApplianceProduct;
  warranties: Warranty;
  proInvoices: ProInvoice;
  applianceCredits: ApplianceCredit;
  attendance: Attendance;
  payslips: Payslip;
  reservations: Reservation;
  serials: SerialNumber;
  maintenance: MaintenanceRecord;
  promotions: Promotion;
  inventories: InventoryCount;
  categories: Category;
  vehicleMaintenances: VehicleMaintenance;
  vehiclePayments: VehiclePayment;
  vehicleSales: VehicleSale;
  products: Product;
  customers: Customer;
  sales: Sale;
  dishes: Dish;
  restoTables: RestaurantTable;
  orders: RestaurantOrder;
  documents: ArchivedDocument;
  settings: CompanySetting;
};


import { supabase } from "@/integrations/supabase/client";

// Untyped handle: generated DB types are refreshed asynchronously.
const sb = supabase as any;


const seeds: { [K in keyof CollectionMap]: CollectionMap[K][] } = {
  suppliers: seedSuppliers,
  employees: seedEmployees,
  expenses: seedExpenses,
  cash: seedCash,
  vehicles: seedVehicles,
  vehicleCredits: seedVCredits,
  rentals: seedRentals,
  appliances: seedAppliances,
  warranties: seedWarranties,
  proInvoices: seedProInvoices,
  applianceCredits: seedACredits,
  attendance: [],
  payslips: [],
  reservations: [
    { id: "rv1", customerName: "Famille Diop", phone: "+221 77 555 12 34", tableNumber: 4, date: new Date().toISOString().slice(0,10), time: "19:30", guests: 6, status: "confirmed", note: "Anniversaire" },
    { id: "rv2", customerName: "Mr. Sarr", phone: "+221 78 111 22 33", tableNumber: 2, date: new Date().toISOString().slice(0,10), time: "20:00", guests: 2, status: "pending" },
  ],
  serials: [],
  maintenance: [
    { id: "mt1", vehicleId: "v1", date: "2026-05-10", type: "Vidange", description: "Vidange 10W40 + filtre", cost: 35000, nextDueKm: 55000 },
    { id: "mt2", vehicleId: "v6", date: "2026-06-01", type: "Réparation", description: "Réparation climatisation", cost: 95000 },
  ],
  promotions: [
    { id: "pr1", name: "Soldes d'été -20%", type: "percent", value: 20, startDate: "2026-06-01", endDate: "2026-06-30", active: true },
  ],
  inventories: [],
  categories: seedCategories,
  vehicleMaintenances: [],
  vehiclePayments: [],
  vehicleSales: [],
  products: seedProducts,
  customers: seedCustomers,
  sales: seedSales,
  dishes: seedDishes,
  restoTables: seedTables,
  orders: seedOrders,
  documents: [],
  settings: [],
};


/** Collection key -> Postgres table name (all tenant-scoped, RLS protected). */
const TABLES: Record<keyof CollectionMap, string> = {
  suppliers: "suppliers",
  employees: "employees",
  expenses: "expenses",
  cash: "cash_movements",
  vehicles: "vehicles",
  vehicleCredits: "vehicle_credits",
  rentals: "rentals",
  appliances: "appliances",
  warranties: "warranties",
  proInvoices: "pro_invoices",
  applianceCredits: "appliance_credits",
  attendance: "attendance",
  payslips: "payslips",
  reservations: "reservations",
  serials: "serials",
  maintenance: "maintenance",
  promotions: "promotions",
  inventories: "inventories",
  categories: "categories",
  vehicleMaintenances: "vehicle_maintenances",
  vehiclePayments: "vehicle_payments",
  vehicleSales: "vehicle_sales",
  products: "products",
  customers: "customers",
  sales: "sales",
  dishes: "dishes",
  restoTables: "resto_tables",
  orders: "orders",
  documents: "documents",
  settings: "company_settings",
};

const ALL_KEYS = Object.keys(TABLES) as Array<keyof CollectionMap>;

const stores: { [K in keyof CollectionMap]?: CollectionMap[K][] } = {};
const listeners: { [K in keyof CollectionMap]?: Set<() => void> } = {};
const EMPTY: any[] = [];

let companyId: string | null = null;
let ready = false;
const readyListeners = new Set<() => void>();

function notify<K extends keyof CollectionMap>(name: K) {
  // new array identity so useSyncExternalStore sees the change
  stores[name] = [...(stores[name] ?? [])] as any;
  listeners[name]?.forEach((l) => l());
}

function subscribe<K extends keyof CollectionMap>(name: K, cb: () => void) {
  if (!listeners[name]) listeners[name] = new Set();
  listeners[name]!.add(cb);
  return () => listeners[name]!.delete(cb);
}

function load<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
  return (stores[name] ?? EMPTY) as CollectionMap[K][];
}

/** Fetch every collection for the active company. Called once after sign-in. */
export async function bindCompany(id: string) {
  companyId = id;
  ready = false;
  readyListeners.forEach((l) => l());
  const results = await Promise.all(
    ALL_KEYS.map(async (key) => {
      const { data, error } = await sb.from(TABLES[key]).select("id, data").eq("company_id", id);
      if (error) return [key, []] as const;
      const rows = (data ?? []).map((r: any) => ({ ...(r.data ?? {}), id: r.id }));
      return [key, rows] as const;
    }),
  );
  results.forEach(([key, rows]) => {
    stores[key] = rows as any;
  });
  ready = true;
  ALL_KEYS.forEach(notify);
  readyListeners.forEach((l) => l());
}

export function unbindCompany() {
  companyId = null;
  ready = false;
  ALL_KEYS.forEach((k) => {
    stores[k] = [] as any;
    notify(k);
  });
  readyListeners.forEach((l) => l());
}

/** True once the company data has been fetched from the backend. */
export function useDataReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      readyListeners.add(cb);
      return () => readyListeners.delete(cb);
    },
    () => ready,
    () => false,
  );
}

export function useCollection<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
  return useSyncExternalStore(
    (cb) => subscribe(name, cb),
    () => (stores[name] ?? EMPTY) as CollectionMap[K][],
    () => EMPTY as CollectionMap[K][],
  );
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function row(id: string, item: any) {
  const { id: _drop, ...rest } = item ?? {};
  return { id, company_id: companyId, data: rest };
}

function fireAndForget(p: Promise<any>) {
  p.then((res: any) => {
    if (res?.error) console.error("[gestiopro] sync error", res.error.message ?? res.error);
  }).catch((e) => console.error("[gestiopro] sync error", e));
}

export const db = {
  list<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
    return load(name);
  },
  /** Optimistic insert: UI updates instantly, the row is persisted in the background. */
  add<K extends keyof CollectionMap>(name: K, item: Omit<CollectionMap[K], "id"> & { id?: string }): CollectionMap[K] {
    const id = (item as any).id ?? uid(String(name).slice(0, 2));
    const withId = { ...(item as any), id } as CollectionMap[K];
    stores[name] = [withId, ...(stores[name] ?? [])] as any;
    notify(name);
    if (companyId) fireAndForget(sb.from(TABLES[name]).insert(row(id, withId)));
    return withId;
  },
  update<K extends keyof CollectionMap>(name: K, id: string, patch: Partial<CollectionMap[K]>): void {
    const list = [...(stores[name] ?? [])] as any[];
    const idx = list.findIndex((it: any) => it.id === id);
    if (idx < 0) return;
    const next = { ...list[idx], ...patch };
    list[idx] = next;
    stores[name] = list as any;
    notify(name);
    if (companyId) {
      fireAndForget(
        sb.from(TABLES[name]).update({ data: row(id, next).data }).eq("company_id", companyId).eq("id", id),
      );
    }
  },
  remove<K extends keyof CollectionMap>(name: K, id: string): void {
    stores[name] = ((stores[name] ?? []) as any[]).filter((it: any) => it.id !== id) as any;
    notify(name);
    if (companyId) {
      fireAndForget(sb.from(TABLES[name]).delete().eq("company_id", companyId).eq("id", id));
    }
  },
  /** Insert or update by id (used for singleton rows like company settings). */
  upsert<K extends keyof CollectionMap>(name: K, item: CollectionMap[K] & { id: string }): void {
    const exists = ((stores[name] ?? []) as any[]).some((it: any) => it.id === item.id);
    if (exists) {
      db.update(name, item.id, item as any);
      return;
    }
    stores[name] = [item, ...(stores[name] ?? [])] as any;
    notify(name);
    if (companyId) {
      fireAndForget(
        sb.from(TABLES[name]).upsert(row(item.id, item), { onConflict: "company_id,id" }),
      );
    }
  },
  reset<K extends keyof CollectionMap>(name: K): void {
    db.replaceAll(name, seeds[name] as any);
  },
  /** Replace a whole collection (local + backend). */
  async replaceAll<K extends keyof CollectionMap>(name: K, items: CollectionMap[K][]) {
    stores[name] = [...items] as any;
    notify(name);
    if (!companyId) return;
    await sb.from(TABLES[name]).delete().eq("company_id", companyId);
    if (items.length) {
      await sb.from(TABLES[name]).insert(items.map((it: any) => row(it.id ?? uid("s"), it)));
    }
  },
  /** Wipe ALL collections for the current company. */
  async wipeAll(): Promise<void> {
    for (const k of ALL_KEYS) {
      stores[k] = [] as any;
      notify(k);
      if (companyId) await sb.from(TABLES[k]).delete().eq("company_id", companyId);
    }
  },
  /** Load the full demo dataset into the current company. */
  async loadDemo(): Promise<void> {
    for (const k of ALL_KEYS) {
      await db.replaceAll(k, [...(seeds[k] as any[])] as any);
    }
  },
};


// Hydration check (avoid SSR mismatch by re-reading after mount)
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

/* ==============================================================
 * VEHICLE SYNC HELPERS — single source of truth for status changes.
 * ============================================================== */

/** Enregistre une dépense ET son décaissement de caisse (synchronisation compta). */
export function addExpense(payload: {
  category: string; label: string; amount: number; date?: string;
  hasReceipt?: boolean; source?: string; paidBy?: string; paymentMethod?: string;
}) {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const e = db.add("expenses", {
    category: payload.category, label: payload.label, amount: payload.amount,
    date, hasReceipt: payload.hasReceipt ?? false,
    source: payload.source ?? "Manuel", paidBy: payload.paidBy,
    paymentMethod: payload.paymentMethod ?? "Caisse principale",
  } as any);
  db.add("cash", {
    type: "out",
    label: payload.label,
    amount: payload.amount,
    date: new Date(date).toISOString(),
    source: payload.paymentMethod ?? "Caisse principale",
  });
  return e;
}

export function startRental(payload: Omit<Rental, "id">): Rental {
  const r = db.add("rentals", payload);
  db.update("vehicles", payload.vehicleId, { status: "rented" } as any);
  if (payload.advance && payload.advance > 0) {
    db.add("cash", {
      type: "in",
      label: `Avance location — ${payload.customer}`,
      amount: payload.advance,
      date: new Date().toISOString(),
      source: "Location auto",
    });
  }
  return r;
}

export function returnRental(
  rentalId: string,
  data: { returnedAt: string; returnKm?: number; fuelLevel?: string; conditionNote?: string },
) {
  const r = db.list("rentals").find((x) => x.id === rentalId);
  if (!r) return;
  db.update("rentals", rentalId, { ...data, status: "returned" } as any);
  const patch: any = { status: "available" };
  if (data.returnKm && data.returnKm > 0) patch.mileageKm = data.returnKm;
  db.update("vehicles", r.vehicleId, patch);
  const due = typeof r.remaining === "number"
    ? r.remaining
    : Math.max(0, (r.totalAmount ?? 0) - (r.advance ?? 0));
  if (due > 0) {
    db.add("cash", {
      type: "in",
      label: `Solde location — ${r.customer}`,
      amount: due,
      date: new Date().toISOString(),
      source: "Location auto",
    });
  }
}

export function isRentalOverdue(r: Rental): boolean {
  if (r.status !== "active") return false;
  return +new Date(r.endDate) < Date.now();
}

export function sellVehicle(payload: {
  vehicleId: string; customer: string; phone?: string;
  amount: number; payment: "cash" | "credit";
}): VehicleSale {
  const sale = db.add("vehicleSales", {
    vehicleId: payload.vehicleId,
    customer: payload.customer,
    phone: payload.phone,
    amount: payload.amount,
    payment: payload.payment,
    date: new Date().toISOString().slice(0, 10),
    status: "done",
  });
  db.update("vehicles", payload.vehicleId, { status: "sold" } as any);
  if (payload.payment === "cash") {
    db.add("cash", {
      type: "in",
      label: `Vente véhicule — ${payload.customer}`,
      amount: payload.amount,
      date: new Date().toISOString(),
      source: "Vente auto",
    });
  }
  return sale;
}

export function startVehicleMaintenance(payload: Omit<VehicleMaintenance, "id">): VehicleMaintenance {
  const m = db.add("vehicleMaintenances", payload);
  db.update("vehicles", payload.vehicleId, { status: "maintenance" } as any);
  return m;
}

export function completeVehicleMaintenance(maintId: string) {
  const m = db.list("vehicleMaintenances").find((x) => x.id === maintId);
  if (!m) return;
  db.update("vehicleMaintenances", maintId, {
    status: "done",
    dateOut: new Date().toISOString().slice(0, 10),
  } as any);
  const cost = (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0);
  if (cost > 0) {
    addExpense({
      category: "Maintenance",
      label: `Maintenance véhicule — ${m.motif}`,
      amount: cost,
      paidBy: m.garage || "—",
      source: "Automobile",
      hasReceipt: true,
    });
  }
  db.update("vehicles", m.vehicleId, { status: "available" } as any);
}

export function addVehicleCreditPayment(
  creditId: string,
  payload: { amount: number; date: string; method: VehiclePayment["method"]; note?: string },
) {
  const credit = db.list("vehicleCredits").find((c) => c.id === creditId);
  if (!credit) return;
  db.add("vehiclePayments", { creditId, ...payload });
  const totalPaid = credit.downPayment
    + db.list("vehiclePayments").filter((p) => p.creditId === creditId)
        .reduce((s, p) => s + p.amount, 0);
  const paidMonths = credit.monthlyPayment > 0
    ? Math.min(credit.totalMonths, Math.floor(totalPaid / credit.monthlyPayment))
    : credit.paidMonths;
  const isDone = totalPaid >= credit.total;
  const nextDue = new Date(payload.date);
  nextDue.setMonth(nextDue.getMonth() + 1);
  db.update("vehicleCredits", creditId, {
    paidMonths,
    status: isDone ? "ok" : (+new Date(credit.nextDueDate) < Date.now() ? "late" : "ok"),
    nextDueDate: isDone ? credit.nextDueDate : nextDue.toISOString().slice(0, 10),
  } as any);
  db.add("cash", {
    type: "in",
    label: `Paiement crédit — ${credit.customer}`,
    amount: payload.amount,
    date: new Date().toISOString(),
    source: payload.method,
  });
}

export function vehicleProfitability(vehicleId: string) {
  const v = db.list("vehicles").find((x) => x.id === vehicleId);
  if (!v) return null;
  const rentals = db.list("rentals").filter((r) => r.vehicleId === vehicleId);
  const sales = db.list("vehicleSales").filter((s) => s.vehicleId === vehicleId);
  const maints = db.list("vehicleMaintenances").filter((m) => m.vehicleId === vehicleId);
  const rentalRevenue = rentals.reduce((s, r) => {
    const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
    return s + days * r.dailyRate;
  }, 0);
  const saleRevenue = sales.reduce((s, x) => s + x.amount, 0);
  const maintCost = maints.reduce((s, m) => s + (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0), 0);
  const baseCost = v.purchasePrice + v.importFees + v.customsFees + v.repairFees + v.maintenanceFees;
  const totalCost = baseCost + maintCost;
  const profit = rentalRevenue + saleRevenue - totalCost;
  return { rentalRevenue, saleRevenue, maintCost, totalCost, profit };
}

/* ==============================================================
 * COFFRE-FORT DOCUMENTAIRE — archivage centralisé.
 * ============================================================== */
export function archiveDocument(payload: {
  type: string;
  reference?: string;
  title: string;
  relatedTo?: string;
  amount?: number;
  entityType?: ArchivedDocument["entityType"];
  entityId?: string;
  entityLabel?: string;
  expiresAt?: string;
  origin?: string;
  dataUrl?: string;
  payload?: any;
}): ArchivedDocument {
  const year = new Date().getFullYear();
  const count = db.list("documents").filter((d) => d.type === payload.type).length + 1;
  const reference = payload.reference
    ?? `${payload.type.slice(0, 3).toUpperCase()}-${year}-${String(count).padStart(4, "0")}`;
  const existing = db.list("documents").find((d) => d.reference === reference);
  if (existing) return existing;
  return db.add("documents", {
    ...payload,
    reference,
    origin: payload.origin ?? "Généré",
    createdAt: new Date().toISOString(),
  } as any);
}
