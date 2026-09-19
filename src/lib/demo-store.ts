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
  type Vehicle, type VehicleCredit, type Rental, type RentalPayment,
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
  documents?: {
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
    size: number;
    dataUrl?: string;
    storageBucket?: string;
    storagePath?: string;
  }[];
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
  rentalPayments: RentalPayment;
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
  rentalPayments: [],
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
  rentalPayments: "rental_payments",
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

export type PrivateDocumentEntityType =
  | "vehicle"
  | "customer"
  | "sale"
  | "credit"
  | "rental"
  | "contract"
  | "maintenance"
  | "payment"
  | "employee"
  | "expense"
  | "cash_movement"
  | "ledger_entry"
  | "company";

export interface PendingPrivateDocument {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface PrivateDocumentSummary {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  storageBucket?: string;
  storagePath?: string;
  dataUrl?: string;
}

export function createPendingPrivateDocument(file: File): PendingPrivateDocument {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export function privateDocumentSummary(doc: PendingPrivateDocument | PrivateDocumentSummary): PrivateDocumentSummary {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    uploadedAt: doc.uploadedAt,
    storageBucket: (doc as PrivateDocumentSummary).storageBucket,
    storagePath: (doc as PrivateDocumentSummary).storagePath,
    dataUrl: (doc as PrivateDocumentSummary).dataUrl,
  };
}

function safeStorageFileName(name: string) {
  const trimmed = name.trim() || "document";
  return trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "document";
}

export async function uploadPrivateDocument(input: {
  file: File;
  documentId?: string;
  type: string;
  title: string;
  reference?: string;
  relatedTo?: string;
  amount?: number;
  entityType: PrivateDocumentEntityType;
  entityId: string;
  entityLabel?: string;
  relationType?: string;
  expiresAt?: string;
  origin?: string;
  metadata?: Record<string, unknown>;
}): Promise<ArchivedDocument> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const documentId = input.documentId ?? crypto.randomUUID();
  const bucket = "company-documents";
  const storagePath = `${companyId}/${documentId}/${safeStorageFileName(input.file.name)}`;
  const mimeType = input.file.type || "application/octet-stream";
  const now = new Date().toISOString();

  const { error: uploadError } = await sb.storage
    .from(bucket)
    .upload(storagePath, input.file, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Le fichier n'a pas pu Ãªtre envoyÃ© dans le stockage privÃ©.");
  }

  const documentData: ArchivedDocument = {
    id: documentId,
    type: input.type,
    reference: input.reference ?? input.file.name,
    title: input.title,
    relatedTo: input.relatedTo,
    amount: input.amount,
    createdAt: now,
    entityType: input.entityType as ArchivedDocument["entityType"],
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    expiresAt: input.expiresAt,
    origin: input.origin ?? "ImportÃ©",
    storageBucket: bucket,
    storagePath,
    mimeType,
    size: input.file.size,
    originalName: input.file.name,
    payload: {
      ...(input.metadata ?? {}),
      storageBucket: bucket,
      storagePath,
      mimeType,
      size: input.file.size,
      originalName: input.file.name,
    },
  };

  const { error: docError } = await sb
    .from("documents")
    .upsert(row(documentId, documentData), { onConflict: "company_id,id" });

  if (docError) {
    await sb.storage.from(bucket).remove([storagePath]);
    throw new Error(docError.message || "Le document n'a pas pu Ãªtre archivÃ©.");
  }

  const { error: relationError } = await sb
    .from("document_relations")
    .insert({
      company_id: companyId,
      document_id: documentId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      relation_type: input.relationType ?? "attachment",
      metadata: input.metadata ?? {},
    });

  if (relationError && relationError.code !== "23505") {
    await sb.from("documents").delete().eq("company_id", companyId).eq("id", documentId);
    await sb.storage.from(bucket).remove([storagePath]);
    throw new Error(relationError.message || "Le document n'a pas pu Ãªtre reliÃ© Ã  son dossier.");
  }

  db.upsertLocal("documents", documentData);
  return documentData;
}

export async function getPrivateDocumentUrl(doc: { dataUrl?: string; storageBucket?: string; storagePath?: string }) {
  if (doc.dataUrl) return doc.dataUrl;
  if (!doc.storagePath) throw new Error("Aucun fichier privÃ© n'est associÃ© Ã  ce document.");

  const { data, error } = await sb.storage
    .from(doc.storageBucket ?? "company-documents")
    .createSignedUrl(doc.storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Lien de tÃ©lÃ©chargement indisponible.");
  }

  return data.signedUrl;
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
  upsertLocal<K extends keyof CollectionMap>(name: K, item: CollectionMap[K] & { id: string }): void {
    const list = [...(stores[name] ?? [])] as any[];
    const idx = list.findIndex((it: any) => it.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    stores[name] = list as any;
    notify(name);
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
  /** Delete remotely first, then update local state after Supabase confirms it. */
  async removeConfirmed<K extends keyof CollectionMap>(name: K, id: string): Promise<void> {
    if (!companyId) {
      throw new Error("Aucune entreprise active n'est disponible.");
    }
    const { data, error } = await sb
      .from(TABLES[name])
      .delete()
      .eq("company_id", companyId)
      .eq("id", id)
      .select("id");
    if (error) {
      throw new Error(error.message || "La suppression du document a échoué.");
    }
    if (!data?.some((row: { id: string }) => row.id === id)) {
      throw new Error("Suppression refusée ou document introuvable.");
    }
    stores[name] = ((stores[name] ?? []) as any[]).filter((it: any) => it.id !== id) as any;
    notify(name);
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

export interface ManualExpensePayload {
  category: string;
  label: string;
  amount: number;
  date?: string;
  hasReceipt?: boolean;
  paymentMethod?: string;
  recurrent?: boolean;
  note?: string;
  idempotencyKey: string;
  sourceId: string;
}

export async function recordManualExpense(payload: ManualExpensePayload) {
  if (!companyId) {
    throw new Error("Aucune entreprise active n'est disponible.");
  }

  const { data, error } = await sb.rpc("record_manual_expense", {
    p_company_id: companyId,
    p_source_id: payload.sourceId,
    p_cash_account_id: payload.paymentMethod === "cash" ? "Caisse principale" : payload.paymentMethod,
    p_amount: payload.amount,
    p_currency: "XOF",
    p_occurred_at: payload.date ? new Date(payload.date).toISOString() : new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey,
    p_description: payload.label,
    p_metadata: {
      category: payload.category,
      hasReceipt: payload.hasReceipt ?? false,
      recurrent: payload.recurrent ?? false,
      note: payload.note ?? "",
    },
  });

  if (error) {
    throw new Error(error.message || "La dépense n'a pas pu être enregistrée.");
  }

  const expense = {
    category: payload.category,
    label: payload.label,
    amount: payload.amount,
    date: payload.date ?? new Date().toISOString().slice(0, 10),
    hasReceipt: payload.hasReceipt ?? false,
    source: "Manuel",
    paymentMethod: payload.paymentMethod ?? "cash",
    recurrent: payload.recurrent ?? false,
    note: payload.note ?? "",
    id: payload.sourceId,
  } as any;
  db.upsertLocal("expenses", expense);

  const cashId = `manual-expense:${data.id}`;
  db.upsertLocal("cash", {
    id: cashId,
    type: "out",
    label: payload.label,
    amount: payload.amount,
    date: payload.date ?? new Date().toISOString(),
    source: payload.paymentMethod === "cash" ? "Caisse principale" : payload.paymentMethod,
    ledgerEntryId: data.id,
  } as CashMovement);

  return { ledgerEntry: data, expense };
}

export interface VehicleCashSalePayload {
  saleId: string;
  vehicleId: string;
  customer: string;
  phone?: string;
  address?: string;
  cin?: string;
  amount: number;
  method: VehicleSale["method"];
  occurredAt?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export async function recordVehicleCashSale(payload: VehicleCashSalePayload) {
  if (!companyId) {
    throw new Error("Aucune entreprise active n'est disponible.");
  }

  const { data, error } = await sb.rpc("record_vehicle_cash_sale", {
    p_company_id: companyId,
    p_sale_id: payload.saleId,
    p_vehicle_id: payload.vehicleId,
    p_customer: payload.customer,
    p_phone: payload.phone ?? "",
    p_address: payload.address ?? "",
    p_cin: payload.cin ?? "",
    p_amount: payload.amount,
    p_currency: "XOF",
    p_method: payload.method ?? "Cash",
    p_occurred_at: payload.occurredAt ?? new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "La vente comptant n'a pas pu être enregistrée.");
  }

  const vehicle = db.list("vehicles").find((item) => item.id === payload.vehicleId);
  if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "sold" });
  db.upsertLocal("vehicleSales", {
    ...(payload.metadata ?? {}),
    id: payload.saleId,
    vehicleId: payload.vehicleId,
    customer: payload.customer,
    phone: payload.phone,
    address: payload.address,
    cin: payload.cin,
    amount: payload.amount,
    date: (payload.occurredAt ?? new Date().toISOString()).slice(0, 10),
    payment: "cash",
    method: payload.method,
    downPayment: payload.amount,
    status: "done",
  });

  return data;
}

export interface VehicleCreditSalePayload {
  saleId: string;
  creditId: string;
  vehicleId: string;
  customer: string;
  phone?: string;
  idDocument?: string;
  total: number;
  downPayment: number;
  totalMonths: number;
  monthlyPayment: number;
  firstDueDate: string;
  currency: string;
  method: VehicleSale["method"];
  occurredAt?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export async function recordVehicleCreditSale(payload: VehicleCreditSalePayload) {
  if (!companyId) {
    throw new Error("Aucune entreprise active n'est disponible.");
  }

  const { data, error } = await sb.rpc("record_vehicle_credit_sale", {
    p_company_id: companyId,
    p_sale_id: payload.saleId,
    p_credit_id: payload.creditId,
    p_vehicle_id: payload.vehicleId,
    p_customer: payload.customer,
    p_phone: payload.phone ?? "",
    p_id_document: payload.idDocument ?? "",
    p_total: payload.total,
    p_down_payment: payload.downPayment,
    p_total_months: payload.totalMonths,
    p_monthly_payment: payload.monthlyPayment,
    p_first_due_date: payload.firstDueDate,
    p_currency: payload.currency,
    p_method: payload.method ?? "Cash",
    p_occurred_at: payload.occurredAt ?? new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "La vente à crédit n'a pas pu être enregistrée.");
  }

  const vehicle = db.list("vehicles").find((item) => item.id === payload.vehicleId);
  if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "sold" });
  db.upsertLocal("vehicleCredits", {
    id: payload.creditId,
    vehicleId: payload.vehicleId,
    customer: payload.customer,
    total: payload.total,
    downPayment: payload.downPayment,
    monthlyPayment: payload.monthlyPayment,
    paidMonths: 0,
    totalMonths: payload.totalMonths,
    nextDueDate: payload.firstDueDate,
    status: "ok",
  });
  db.upsertLocal("vehicleSales", {
    ...(payload.metadata ?? {}),
    id: payload.saleId,
    vehicleId: payload.vehicleId,
    customer: payload.customer,
    phone: payload.phone,
    amount: payload.total,
    payment: "credit",
    method: payload.method,
    downPayment: payload.downPayment,
    creditId: payload.creditId,
    date: (payload.occurredAt ?? new Date().toISOString()).slice(0, 10),
    status: "done",
  });
  if (payload.downPayment > 0 && data?.ledger_entry_id) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      type: "in",
      label: `Apport crédit — ${payload.customer}`,
      amount: payload.downPayment,
      date: payload.occurredAt ?? new Date().toISOString(),
      source: payload.method,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }

  return data;
}


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
  /** Rattachement analytique à un véhicule (carburant, réparation, entretien…) */
  vehicleId?: string;
  /** "maintenance" pour les dépenses générées par le module Maintenance */
  kind?: string;
}) {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const e = db.add("expenses", {
    category: payload.category, label: payload.label, amount: payload.amount,
    date, hasReceipt: payload.hasReceipt ?? false,
    source: payload.source ?? "Manuel", paidBy: payload.paidBy,
    paymentMethod: payload.paymentMethod ?? "Caisse principale",
    vehicleId: payload.vehicleId, kind: payload.kind,
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

export async function recordPayrollPayment(payload: {
  paymentId: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advances: number;
  currency: string;
  method: string;
  paidAt: string;
  idempotencyKey: string;
}) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_payroll_payment", {
    p_company_id: companyId,
    p_payment_id: payload.paymentId,
    p_employee_id: payload.employeeId,
    p_month: payload.month,
    p_base_salary: payload.baseSalary,
    p_bonuses: payload.bonuses,
    p_deductions: payload.deductions,
    p_advances: payload.advances,
    p_currency: payload.currency,
    p_method: payload.method,
    p_paid_at: payload.paidAt,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: {},
  });

  if (error) {
    throw new Error(error.message || "Le paiement du salaire n'a pas pu être enregistré.");
  }

  if (data?.payslip) db.upsertLocal("payslips", { id: data.payslip_id, ...data.payslip });
  if (data?.expense) db.upsertLocal("expenses", { id: data.expense_id, ...data.expense });
  if (data?.cash) db.upsertLocal("cash", {
    id: data.cash_movement_id,
    ...data.cash,
    ledgerEntryId: data.ledger_entry_id,
  });
  if (data?.document) db.upsertLocal("documents", { id: data.document_id, ...data.document });

  return data;
}

export async function startRental(
  payload: Omit<Rental, "id"> & { rentalId: string; idempotencyKey: string; currency: string; method: string },
) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_vehicle_rental", {
    p_company_id: companyId,
    p_rental_id: payload.rentalId,
    p_vehicle_id: payload.vehicleId,
    p_customer: payload.customer,
    p_phone: payload.phone ?? "",
    p_address: payload.address ?? "",
    p_id_document: payload.idDocument ?? "",
    p_license_number: payload.licenseNumber ?? "",
    p_start_date: payload.startDate,
    p_end_date: payload.endDate,
    p_start_time: payload.startTime ?? "",
    p_end_time: payload.endTime ?? "",
    p_daily_rate: payload.dailyRate,
    p_deposit: payload.deposit,
    p_advance: payload.advance ?? 0,
    p_currency: payload.currency,
    p_method: payload.method,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: { notes: payload.notes ?? "" },
  });

  if (error) {
    throw new Error(error.message || "La location n'a pas pu être enregistrée.");
  }

  const rental = data?.rental ? { id: data.rental_id, ...data.rental } as Rental : null;
  if (rental) db.upsertLocal("rentals", rental);
  const vehicle = db.list("vehicles").find((item) => item.id === payload.vehicleId);
  if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "rented" });
  if (data?.cash_movement_id && data?.ledger_entry_id && (payload.advance ?? 0) > 0) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      type: "in",
      label: `Avance location — ${payload.customer}`,
      amount: payload.advance,
      date: payload.startDate,
      source: payload.method,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }
  return data;
}

export async function recordRentalPayment(
  rentalId: string,
  payload: {
    paymentId: string;
    amount: number;
    date: string;
    currency: string;
    method: string;
    idempotencyKey: string;
    note?: string;
  },
) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_rental_payment", {
    p_company_id: companyId,
    p_payment_id: payload.paymentId,
    p_rental_id: rentalId,
    p_amount: payload.amount,
    p_payment_date: payload.date,
    p_currency: payload.currency,
    p_method: payload.method,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: { note: payload.note ?? "" },
  });

  if (error) {
    throw new Error(error.message || "Le paiement de la location n'a pas pu être enregistré.");
  }

  if (data?.rental) db.upsertLocal("rentals", { id: data.rental_id, ...data.rental });
  if (data?.payment) db.upsertLocal("rentalPayments", { id: data.payment_id, ...data.payment });
  if (data?.cash_movement_id && data?.ledger_entry_id) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      type: "in",
      label: "Paiement location",
      amount: payload.amount,
      date: payload.date,
      source: payload.method,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }
  return data;
}

export async function recordVehicleRentalReturn(
  rentalId: string,
  payload: {
    returnDate: string;
    returnKm: number;
    fuelLevel?: string;
    conditionNote?: string;
    paymentId: string;
    currency: string;
    method: string;
    idempotencyKey: string;
  },
) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_vehicle_rental_return", {
    p_company_id: companyId,
    p_rental_id: rentalId,
    p_return_date: payload.returnDate,
    p_return_km: payload.returnKm,
    p_fuel_level: payload.fuelLevel ?? "",
    p_condition_note: payload.conditionNote ?? "",
    p_payment_id: payload.paymentId,
    p_currency: payload.currency,
    p_method: payload.method,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: {},
  });

  if (error) {
    throw new Error(error.message || "Le retour de la location n'a pas pu être enregistré.");
  }

  if (data?.rental) db.upsertLocal("rentals", { id: data.rental_id, ...data.rental });
  const rental = db.list("rentals").find((item) => item.id === rentalId);
  if (rental) {
    const vehicle = db.list("vehicles").find((item) => item.id === rental.vehicleId);
    if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "available", mileageKm: payload.returnKm });
  }
  if (data?.payment) db.upsertLocal("rentalPayments", { id: data.payment_id, ...data.payment });
  if (data?.cash_movement_id && data?.ledger_entry_id && data?.payment) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      type: "in",
      label: "Solde retour location",
      amount: data.payment.amount,
      date: payload.returnDate,
      source: payload.method,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }
  return data;
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

export async function completeVehicleMaintenance(payload: {
  maintenanceId: string;
  completedAt: string;
  currency: string;
  paymentMethod: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("complete_vehicle_maintenance", {
    p_company_id: companyId,
    p_maintenance_id: payload.maintenanceId,
    p_completed_at: payload.completedAt,
    p_currency: payload.currency,
    p_payment_method: payload.paymentMethod,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "La clôture de la maintenance a échoué.");
  }

  if (data?.maintenance) {
    db.upsertLocal("vehicleMaintenances", {
      id: data.maintenance_id,
      ...data.maintenance,
    });
  }

  const vehicle = db.list("vehicles").find((item) => item.id === data?.vehicle_id);
  if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "available" });

  if (data?.expense_id && data.expense) {
    db.upsertLocal("expenses", { id: data.expense_id, ...data.expense });
  }
  if (data?.cash_movement_id && data.cash) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      ...data.cash,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }

  return data;
}

export async function addVehicleCreditPayment(
  creditId: string,
  payload: {
    paymentId: string;
    amount: number;
    date: string;
    method: VehiclePayment["method"];
    currency: string;
    idempotencyKey: string;
    note?: string;
  },
) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_vehicle_credit_payment", {
    p_company_id: companyId,
    p_payment_id: payload.paymentId,
    p_credit_id: creditId,
    p_amount: payload.amount,
    p_payment_date: payload.date,
    p_currency: payload.currency,
    p_method: payload.method,
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: { note: payload.note ?? "" },
  });

  if (error) {
    throw new Error(error.message || "Le paiement du crédit n'a pas pu être enregistré.");
  }

  if (data?.credit) {
    db.upsertLocal("vehicleCredits", { id: creditId, ...data.credit });
  }
  if (data?.payment) {
    db.upsertLocal("vehiclePayments", { id: payload.paymentId, ...data.payment });
  }
  if (data?.cash_movement_id && data?.ledger_entry_id) {
    db.upsertLocal("cash", {
      id: data.cash_movement_id,
      type: "in",
      label: `Paiement crédit`,
      amount: payload.amount,
      date: payload.date,
      source: payload.method,
      ledgerEntryId: data.ledger_entry_id,
    } as CashMovement);
  }
  return data;
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

  // Dépenses d'exploitation rattachées au véhicule (carburant, réparations,
  // assurance, lavage…) saisies dans le module Dépenses. Les dépenses issues
  // d'une maintenance sont exclues : elles sont déjà comptées dans maintCost.
  const linked = db.list("expenses").filter((e: any) => {
    const isMaintenanceExpense = Boolean(e.maintenanceId)
      || e.kind === "maintenance"
      || String(e.source ?? "").toLowerCase() === "maintenance"
      || e.source_type === "maintenance_completion";
    return e.vehicleId === vehicleId && !isMaintenanceExpense;
  });
  const fuelCost = linked.filter((e: any) => e.category === "Carburant").reduce((s: number, e: any) => s + e.amount, 0);
  const repairCost = linked
    .filter((e: any) => e.category === "Maintenance" || e.category === "Réparation")
    .reduce((s: number, e: any) => s + e.amount, 0);
  const otherOpCost = linked.reduce((s: number, e: any) => s + e.amount, 0) - fuelCost - repairCost;
  const operatingCost = fuelCost + repairCost + otherOpCost;

  const acquisitionCost = v.purchasePrice + v.importFees + v.customsFees;
  const baseCost = acquisitionCost + v.repairFees + v.maintenanceFees;
  const totalCost = baseCost + maintCost + operatingCost;
  const profit = rentalRevenue + saleRevenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return {
    rentalRevenue, saleRevenue, maintCost, totalCost, profit, margin,
    acquisitionCost, baseCost, fuelCost, repairCost, otherOpCost, operatingCost,
  };
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
