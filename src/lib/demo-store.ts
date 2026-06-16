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
};

// Hydration check (avoid SSR mismatch by re-reading after mount)
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
