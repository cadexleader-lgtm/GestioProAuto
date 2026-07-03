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
  amount: number;
  date: string;
  payment: "cash" | "credit";
  creditId?: string;
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
};


const STORAGE_PREFIX = "gestiopro.v2.";

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
};


const stores: { [K in keyof CollectionMap]?: CollectionMap[K][] } = {};
const listeners: { [K in keyof CollectionMap]?: Set<() => void> } = {};

function load<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
  if (stores[name]) return stores[name] as CollectionMap[K][];
  if (typeof window === "undefined") return seeds[name];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + name);
    stores[name] = raw ? JSON.parse(raw) : [...seeds[name]] as any;
  } catch {
    stores[name] = [...seeds[name]] as any;
  }
  return stores[name] as CollectionMap[K][];
}

function persist<K extends keyof CollectionMap>(name: K) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(stores[name])); } catch {}
  listeners[name]?.forEach((l) => l());
}

function subscribe<K extends keyof CollectionMap>(name: K, cb: () => void) {
  if (!listeners[name]) listeners[name] = new Set();
  listeners[name]!.add(cb);
  return () => listeners[name]!.delete(cb);
}

export function useCollection<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
  // ensure loaded
  load(name);
  return useSyncExternalStore(
    (cb) => subscribe(name, cb),
    () => stores[name] as CollectionMap[K][],
    () => seeds[name] as CollectionMap[K][],
  );
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const db = {
  list<K extends keyof CollectionMap>(name: K): CollectionMap[K][] {
    return load(name);
  },
  add<K extends keyof CollectionMap>(name: K, item: Omit<CollectionMap[K], "id"> & { id?: string }): CollectionMap[K] {
    const list = load(name);
    const withId = { ...(item as any), id: (item as any).id ?? uid(String(name).slice(0, 2)) } as CollectionMap[K];
    list.unshift(withId);
    persist(name);
    return withId;
  },
  update<K extends keyof CollectionMap>(name: K, id: string, patch: Partial<CollectionMap[K]>): void {
    const list = load(name);
    const idx = list.findIndex((it: any) => it.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...patch } as CollectionMap[K];
    persist(name);
  },
  remove<K extends keyof CollectionMap>(name: K, id: string): void {
    const list = load(name);
    const idx = list.findIndex((it: any) => it.id === id);
    if (idx >= 0) list.splice(idx, 1);
    persist(name);
  },
  reset<K extends keyof CollectionMap>(name: K): void {
    stores[name] = [...seeds[name]] as any;
    persist(name);
  },
  /** Wipe ALL collections — used by "Vider toutes les données" in Settings. */
  wipeAll(): void {
    (Object.keys(seeds) as Array<keyof CollectionMap>).forEach((k) => {
      stores[k] = [] as any;
      persist(k);
    });
  },
  /** Load full demo dataset from the seed constants. */
  loadDemo(): void {
    (Object.keys(seeds) as Array<keyof CollectionMap>).forEach((k) => {
      stores[k] = [...seeds[k]] as any;
      persist(k);
    });
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

export function startRental(payload: Omit<Rental, "id">): Rental {
  const r = db.add("rentals", payload);
  db.update("vehicles", payload.vehicleId, { status: "rented" } as any);
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
    db.add("expenses", {
      label: `Maintenance véhicule — ${m.motif}`,
      amount: cost,
      date: new Date().toISOString().slice(0, 10),
      category: "Maintenance",
      paidBy: m.garage || "—",
    } as any);
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
