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
  type Supplier, type Employee, type Expense, type CashMovement,
  type Vehicle, type VehicleCredit, type Rental, type RentalPayment,
} from "./demo-data";

export interface ArchivedDocument {
  id: string;
  type: string;
  reference: string;
  title: string;
  relatedTo?: string;
  amount?: number;
  createdAt: string;
  dataUrl?: string;
  storageBucket?: string;
  storagePath?: string;
  mimeType?: string;
  size?: number;
  originalName?: string;
  /** Entité rattachée : véhicule, client, employé… */
  entityType?: "vehicle" | "customer" | "employee" | "supplier" | "sale" | "credit" | "rental" | "maintenance" | "payment" | "company" | "other";
  entityId?: string;
  entityLabel?: string;
  /** Date d'expiration (assurance, visite technique, contrat…) */
  expiresAt?: string;
  /** Origine du document : "Généré" ou "Importé" */
  origin?: string;
  payload?: any;
}


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
  status?: "posted" | "partial" | "cancelled";
  netDue?: number;
  paidAmount?: number;
  remaining?: number;
  installments?: { amount: number; paidAt: string; method: string; paymentId: string; ledgerEntryId?: string; expenseId?: string; cashMovementId?: string }[];
  cancelledAt?: string;
  cancelReason?: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  method: string;
  grantedAt: string;
  note?: string;
  status: "outstanding" | "settled";
  settledInPayslipId?: string;
  settledAt?: string;
  ledgerEntryId?: string;
  cashMovementId?: string;
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
  attendance: Attendance;
  payslips: Payslip;
  salaryAdvances: SalaryAdvance;
  maintenance: MaintenanceRecord;
  vehicleMaintenances: VehicleMaintenance;
  vehiclePayments: VehiclePayment;
  vehicleSales: VehicleSale;
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
  attendance: [],
  payslips: [],
  salaryAdvances: [],
  maintenance: [
    { id: "mt1", vehicleId: "v1", date: "2026-05-10", type: "Vidange", description: "Vidange 10W40 + filtre", cost: 35000, nextDueKm: 55000 },
    { id: "mt2", vehicleId: "v6", date: "2026-06-01", type: "Réparation", description: "Réparation climatisation", cost: 95000 },
  ],
  vehicleMaintenances: [],
  vehiclePayments: [],
  vehicleSales: [],
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
  attendance: "attendance",
  payslips: "payslips",
  salaryAdvances: "salary_advances",
  maintenance: "maintenance",
  vehicleMaintenances: "vehicle_maintenances",
  vehiclePayments: "vehicle_payments",
  vehicleSales: "vehicle_sales",
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

/** Combine message + detail + hint renvoyes par une RPC Postgres en un seul message lisible. */
function rpcErrorMessage(error: { message?: string; details?: string; hint?: string }, fallback: string): string {
  const parts = [error?.message, error?.details, error?.hint].filter(Boolean);
  return parts.length ? parts.join(" ") : fallback;
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

export async function getPrivateDocumentUrl(
  doc: { dataUrl?: string; storageBucket?: string; storagePath?: string },
  expiresInSeconds = 60,
) {
  if (doc.dataUrl) return doc.dataUrl;
  if (!doc.storagePath) throw new Error("Aucun fichier privÃ© n'est associÃ© Ã  ce document.");

  const { data, error } = await sb.storage
    .from(doc.storageBucket ?? "company-documents")
    .createSignedUrl(doc.storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Lien de tÃ©lÃ©chargement indisponible.");
  }

  return data.signedUrl;
}

/**
 * Photo de couverture d'un véhicule — bucket PUBLIC dédié (`vehicle-photos`),
 * distinct du coffre-fort privé `company-documents` : une photo de véhicule
 * n'est pas une donnée sensible et doit rester visible par tous les rôles
 * (y compris terrain). Chemin stable par véhicule (upsert), pas d'historique
 * de versions à gérer — un remplacement écrase simplement l'ancien fichier.
 */
export async function uploadVehiclePhoto(input: { vehicleId: string; file: File }): Promise<string> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const bucket = "vehicle-photos";
  const ext = (input.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${companyId}/${input.vehicleId}/cover.${ext}`;

  const { error } = await sb.storage
    .from(bucket)
    .upload(path, input.file, { contentType: input.file.type || "image/jpeg", upsert: true });

  if (error) {
    throw new Error(error.message || "La photo n'a pas pu être envoyée.");
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  // Le chemin est stable (upsert) : on casse le cache navigateur/CDN sur
  // chaque remplacement, sinon l'ancienne image reste affichée.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Photo de galerie (en plus de la couverture) — chemin unique par photo
 * (contrairement à la couverture, plusieurs coexistent : pas d'upsert sur
 * un chemin stable ici, chaque ajout est un nouveau fichier).
 */
export async function uploadVehicleGalleryPhoto(input: { vehicleId: string; file: File }): Promise<string> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const bucket = "vehicle-photos";
  const ext = (input.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${companyId}/${input.vehicleId}/gallery-${crypto.randomUUID()}.${ext}`;

  const { error } = await sb.storage
    .from(bucket)
    .upload(path, input.file, { contentType: input.file.type || "image/jpeg" });

  if (error) {
    throw new Error(error.message || "La photo n'a pas pu être envoyée.");
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Vidéo de présentation — chemin stable (upsert), une seule vidéo par véhicule. */
export async function uploadVehicleVideo(input: { vehicleId: string; file: File }): Promise<string> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const bucket = "vehicle-photos";
  const ext = (input.file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `${companyId}/${input.vehicleId}/video.${ext}`;

  const { error } = await sb.storage
    .from(bucket)
    .upload(path, input.file, { contentType: input.file.type || "video/mp4", upsert: true });

  if (error) {
    throw new Error(error.message || "La vidéo n'a pas pu être envoyée.");
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Attache un fichier PDF déjà généré côté client à un document de type
 * "bulletin" existant (créé par la RPC record_payroll_payment). La ligne
 * "documents" est verrouillée en écriture directe pour ce type — seule la
 * RPC attach_payslip_document_file (SECURITY DEFINER, rôle manager+) peut
 * y poser le storagePath après upload du fichier dans Storage.
 */
export async function attachPayslipDocumentFile(input: { documentId: string; file: File }): Promise<void> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const bucket = "company-documents";
  const storagePath = `${companyId}/${input.documentId}/${safeStorageFileName(input.file.name)}`;
  const mimeType = input.file.type || "application/pdf";

  const { error: uploadError } = await sb.storage
    .from(bucket)
    .upload(storagePath, input.file, { contentType: mimeType, upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message || "Le bulletin n'a pas pu être envoyé dans le stockage privé.");
  }

  const { data, error } = await sb.rpc("attach_payslip_document_file", {
    p_company_id: companyId,
    p_document_id: input.documentId,
    p_storage_bucket: bucket,
    p_storage_path: storagePath,
    p_mime_type: mimeType,
    p_size: input.file.size,
    p_original_name: input.file.name,
  });

  if (error) {
    await sb.storage.from(bucket).remove([storagePath]);
    throw new Error(error.message || "Le bulletin n'a pas pu être archivé.");
  }

  db.upsertLocal("documents", { id: input.documentId, ...(data as Record<string, unknown>) } as any);
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
  /**
   * Wipe ALL collections for the current company. Ne vide localement que ce qui a
   * réellement été supprimé côté serveur — plusieurs tables (ventes, mouvements de
   * caisse, ledger, locations, paie, maintenance) ont leur DELETE révoqué pour
   * `authenticated` (historique financier protégé), la suppression y échoue donc
   * silencieusement côté Postgres et ne doit pas non plus vider l'état local.
   */
  async wipeAll(): Promise<{ cleared: string[]; blocked: string[] }> {
    const cleared: string[] = [];
    const blocked: string[] = [];
    for (const k of ALL_KEYS) {
      if (!companyId) { blocked.push(k); continue; }
      const { error } = await sb.from(TABLES[k]).delete().eq("company_id", companyId);
      if (error) {
        blocked.push(k);
        continue;
      }
      cleared.push(k);
      stores[k] = [] as any;
      notify(k);
    }
    return { cleared, blocked };
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

export interface CashMovementPayload {
  movementId: string;
  type: "in" | "out";
  cashAccountId: string;
  amount: number;
  label: string;
  occurredAt?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export async function recordCashMovement(payload: CashMovementPayload) {
  if (!companyId) {
    throw new Error("Aucune entreprise active n'est disponible.");
  }

  const { data, error } = await sb.rpc("record_cash_movement", {
    p_company_id: companyId,
    p_movement_id: payload.movementId,
    p_type: payload.type,
    p_cash_account_id: payload.cashAccountId,
    p_amount: payload.amount,
    p_currency: "XOF",
    p_occurred_at: payload.occurredAt ?? new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey,
    p_description: payload.label,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(rpcErrorMessage(error, "Le mouvement de caisse n'a pas pu être enregistré."));
  }

  db.upsertLocal("cash", {
    id: `manual-cash:${data.id}`,
    type: payload.type,
    label: payload.label,
    amount: payload.amount,
    date: payload.occurredAt ?? new Date().toISOString(),
    source: payload.cashAccountId,
    ledgerEntryId: data.id,
  } as CashMovement);

  return data;
}

export interface CashTransferPayload {
  transferId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  occurredAt?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export async function recordCashTransfer(payload: CashTransferPayload) {
  if (!companyId) {
    throw new Error("Aucune entreprise active n'est disponible.");
  }

  const { data, error } = await sb.rpc("record_cash_transfer", {
    p_company_id: companyId,
    p_transfer_id: payload.transferId,
    p_source_account_id: payload.sourceAccountId,
    p_destination_account_id: payload.destinationAccountId,
    p_amount: payload.amount,
    p_currency: "XOF",
    p_occurred_at: payload.occurredAt ?? new Date().toISOString(),
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(rpcErrorMessage(error, "Le virement n'a pas pu être enregistré."));
  }

  if (data?.out) {
    db.upsertLocal("cash", {
      id: `manual-cash:${data.out.id}`,
      type: "out",
      label: data.out.description,
      amount: payload.amount,
      date: payload.occurredAt ?? new Date().toISOString(),
      source: payload.sourceAccountId,
      ledgerEntryId: data.out.id,
      sourceType: "manual_cash_transfer",
    } as CashMovement);
  }
  if (data?.in) {
    db.upsertLocal("cash", {
      id: `manual-cash:${data.in.id}`,
      type: "in",
      label: data.in.description,
      amount: payload.amount,
      date: payload.occurredAt ?? new Date().toISOString(),
      sourceType: "manual_cash_transfer",
      source: payload.destinationAccountId,
      ledgerEntryId: data.in.id,
    } as CashMovement);
  }

  return data;
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

export async function createSupplier(payload: Omit<Supplier, "id"> & { supplierId: string }): Promise<Supplier> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");
  const { supplierId, ...data } = payload;

  const { data: row, error } = await sb.rpc("create_supplier", {
    p_company_id: companyId,
    p_supplier_id: supplierId,
    p_data: data,
  });

  if (error) {
    throw new Error(rpcErrorMessage(error, "Le fournisseur n'a pas pu être créé."));
  }

  const supplier = { id: row.id, ...(row.data ?? {}) } as Supplier;
  db.upsertLocal("suppliers", supplier);
  return supplier;
}

export async function createEmployee(payload: Omit<Employee, "id"> & { employeeId: string }): Promise<Employee> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");
  const { employeeId, ...data } = payload;

  const { data: row, error } = await sb.rpc("create_employee", {
    p_company_id: companyId,
    p_employee_id: employeeId,
    p_data: data,
  });

  if (error) {
    throw new Error(rpcErrorMessage(error, "L'employé n'a pas pu être créé."));
  }

  const employee = { id: row.id, ...(row.data ?? {}) } as Employee;
  db.upsertLocal("employees", employee);
  return employee;
}

export async function terminateEmployee(payload: { employeeId: string; reason: string; terminatedAt: string }): Promise<Employee> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("terminate_employee", {
    p_company_id: companyId,
    p_employee_id: payload.employeeId,
    p_reason: payload.reason,
    p_terminated_at: payload.terminatedAt,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Le statut de l'employé n'a pas pu être modifié."));

  const employee = { id: row.id, ...(row.data ?? {}) } as Employee;
  db.upsertLocal("employees", employee);
  return employee;
}

export async function reactivateEmployee(employeeId: string): Promise<Employee> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("reactivate_employee", {
    p_company_id: companyId,
    p_employee_id: employeeId,
  });

  if (error) throw new Error(rpcErrorMessage(error, "L'employé n'a pas pu être réactivé."));

  const employee = { id: row.id, ...(row.data ?? {}) } as Employee;
  db.upsertLocal("employees", employee);
  return employee;
}

export async function updateEmployeeSalary(payload: { employeeId: string; newSalary: number; effectiveAt: string; reason?: string }): Promise<Employee> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("update_employee_salary", {
    p_company_id: companyId,
    p_employee_id: payload.employeeId,
    p_new_salary: payload.newSalary,
    p_effective_at: payload.effectiveAt,
    p_reason: payload.reason ?? "",
  });

  if (error) throw new Error(rpcErrorMessage(error, "Le salaire n'a pas pu être modifié."));

  const employee = { id: row.id, ...(row.data ?? {}) } as Employee;
  db.upsertLocal("employees", employee);
  return employee;
}

export async function grantSalaryAdvance(payload: {
  advanceId: string;
  employeeId: string;
  amount: number;
  currency: string;
  method: string;
  grantedAt: string;
  note?: string;
  idempotencyKey: string;
}) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("grant_salary_advance", {
    p_company_id: companyId,
    p_advance_id: payload.advanceId,
    p_employee_id: payload.employeeId,
    p_amount: payload.amount,
    p_currency: payload.currency,
    p_method: payload.method,
    p_granted_at: payload.grantedAt,
    p_note: payload.note ?? "",
    p_idempotency_key: payload.idempotencyKey,
  });

  if (error) throw new Error(rpcErrorMessage(error, "L'avance n'a pas pu être enregistrée."));

  if (data?.advance) db.upsertLocal("salaryAdvances", { id: data.advance_id, ...data.advance });
  if (data?.cash) db.upsertLocal("cash", { id: data.cash_movement_id, ...data.cash, ledgerEntryId: data.ledger_entry_id });

  return data;
}

/** Employé + montant total des avances en cours (non encore rattachées à un bulletin). */
export function outstandingAdvancesFor(employeeId: string): { ids: string[]; total: number } {
  const advances = db.list("salaryAdvances").filter((a) => a.employeeId === employeeId && a.status === "outstanding");
  return { ids: advances.map((a) => a.id), total: advances.reduce((s, a) => s + a.remainingAmount, 0) };
}

async function settleSalaryAdvances(advanceIds: string[], payslipId: string) {
  if (!companyId || advanceIds.length === 0) return;

  const { data, error } = await sb.rpc("settle_salary_advances", {
    p_company_id: companyId,
    p_advance_ids: advanceIds,
    p_payslip_id: payslipId,
  });

  if (error) return; // Paiement déjà acquis ; le rattachement des avances n'est pas bloquant.
  (data as any[] | null)?.forEach((row) => db.upsertLocal("salaryAdvances", { id: row.id, ...row.data }));
}

/* ==============================================================
 * VEHICLE SYNC HELPERS — single source of truth for status changes.
 * ============================================================== */

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
  /** Avances en cours de l'employé à rattacher à ce bulletin (déjà comptées dans `deductions`/`advances`). */
  settleAdvanceIds?: string[];
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

  if (payload.settleAdvanceIds?.length) {
    await settleSalaryAdvances(payload.settleAdvanceIds, data.payslip_id);
  }

  return data;
}

export async function recordPayrollInstallment(payload: {
  paymentId: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advances: number;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
  idempotencyKey: string;
  /** Avances en cours de l'employé à rattacher (uniquement sur le 1er versement du mois). */
  settleAdvanceIds?: string[];
}) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("record_payroll_installment", {
    p_company_id: companyId,
    p_payment_id: payload.paymentId,
    p_employee_id: payload.employeeId,
    p_month: payload.month,
    p_base_salary: payload.baseSalary,
    p_bonuses: payload.bonuses,
    p_deductions: payload.deductions,
    p_advances: payload.advances,
    p_amount: payload.amount,
    p_currency: payload.currency,
    p_method: payload.method,
    p_paid_at: payload.paidAt,
    p_idempotency_key: payload.idempotencyKey,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Le versement n'a pas pu être enregistré."));

  if (data?.payslip) db.upsertLocal("payslips", { id: data.payslip_id, ...data.payslip });
  if (data?.document) db.upsertLocal("documents", { id: data.document_id, ...data.document });

  if (payload.settleAdvanceIds?.length) {
    await settleSalaryAdvances(payload.settleAdvanceIds, data.payslip_id);
  }

  return data;
}

export async function cancelPayrollPayment(payload: { payslipId: string; reason: string }) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("cancel_payroll_payment", {
    p_company_id: companyId,
    p_payslip_id: payload.payslipId,
    p_reason: payload.reason,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Le paiement n'a pas pu être annulé."));

  if (data?.payslip) db.upsertLocal("payslips", { id: data.payslip_id, ...data.payslip });

  return data;
}

export async function setFeatureFlags(flags: Record<string, boolean>) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("set_feature_flags", {
    p_company_id: companyId,
    p_flags: flags,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Les modules n'ont pas pu être mis à jour."));

  const setting = { id: row.id, ...(row.data ?? {}) };
  db.upsertLocal("settings", setting);
  return setting;
}

/** Enregistre le profil "Identite & documents" (logo, signature, cachet,
 * coordonnees, articles de contrats) via une RPC dediee -- company_settings
 * est ecriture-RPC-only depuis le durcissement des feature flags, voir
 * 20260925100000_add_set_company_profile_rpc.sql. */
export async function setCompanyProfile(profile: Record<string, unknown>) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("set_company_profile", {
    p_company_id: companyId,
    p_profile: profile,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Le profil de l'entreprise n'a pas pu être enregistré."));

  const setting = { id: row.id, ...(row.data ?? {}) };
  db.upsertLocal("settings", setting);
  return setting;
}

export function getActiveCompanyId(): string | null {
  return companyId;
}

/** Rattache la liste de documents d'une vente via une RPC dediee -- vehicle_sales
 * est ecriture-RPC-only (durci des sa creation), voir
 * 20260925110000_add_attach_sale_documents_rpc.sql. Utilise par la migration
 * des anciens documents Base64 (Documents.tsx). */
export async function attachSaleDocuments(saleId: string, documents: unknown[]) {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data: row, error } = await sb.rpc("attach_sale_documents", {
    p_company_id: companyId,
    p_sale_id: saleId,
    p_documents: documents,
  });

  if (error) throw new Error(rpcErrorMessage(error, "Les documents de la vente n'ont pas pu être mis à jour."));

  const sale = { id: row.id, ...(row.data ?? {}) };
  db.upsertLocal("vehicleSales", sale as any);
  return sale;
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

export async function openVehicleMaintenance(payload: {
  maintenanceId: string;
  vehicleId: string;
  motif: string;
  type: string;
  garage?: string;
  priority: string;
  dateIn: string;
  partsCost?: number;
  laborCost?: number;
  otherCost?: number;
  notes?: string;
  idempotencyKey: string;
}): Promise<VehicleMaintenance> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("open_vehicle_maintenance", {
    p_company_id: companyId,
    p_maintenance_id: payload.maintenanceId,
    p_vehicle_id: payload.vehicleId,
    p_motif: payload.motif,
    p_type: payload.type,
    p_garage: payload.garage ?? "",
    p_priority: payload.priority,
    p_date_in: payload.dateIn,
    p_parts_cost: payload.partsCost ?? 0,
    p_labor_cost: payload.laborCost ?? 0,
    p_other_cost: payload.otherCost ?? 0,
    p_notes: payload.notes ?? "",
    p_idempotency_key: payload.idempotencyKey,
    p_metadata: {},
  });

  if (error) {
    throw new Error(error.message || "La maintenance n'a pas pu être ouverte.");
  }

  const maintenance = { id: data.maintenance_id, ...data.maintenance } as VehicleMaintenance;
  db.upsertLocal("vehicleMaintenances", maintenance);

  const vehicle = db.list("vehicles").find((v) => v.id === payload.vehicleId);
  if (vehicle) db.upsertLocal("vehicles", { ...vehicle, status: "maintenance" });

  return maintenance;
}

export async function updateVehicleMaintenance(payload: {
  maintenanceId: string;
  status?: VehicleMaintenance["status"];
  partsCost?: number;
  laborCost?: number;
  otherCost?: number;
  garage?: string;
  notes?: string;
  priority?: string;
}): Promise<VehicleMaintenance> {
  if (!companyId) throw new Error("Aucune entreprise active n'est disponible.");

  const { data, error } = await sb.rpc("update_vehicle_maintenance", {
    p_company_id: companyId,
    p_maintenance_id: payload.maintenanceId,
    p_status: payload.status ?? null,
    p_parts_cost: payload.partsCost ?? null,
    p_labor_cost: payload.laborCost ?? null,
    p_other_cost: payload.otherCost ?? null,
    p_garage: payload.garage ?? null,
    p_notes: payload.notes ?? null,
    p_priority: payload.priority ?? null,
  });

  if (error) {
    throw new Error(error.message || "La maintenance n'a pas pu être mise à jour.");
  }

  const maintenance = { id: data.maintenance_id, ...data.maintenance } as VehicleMaintenance;
  db.upsertLocal("vehicleMaintenances", maintenance);
  return maintenance;
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

/* ==============================================================
 * SOURCE UNIQUE — CA signé / trésorerie réelle / encours crédit.
 * Utilisées par VehiculesDashboard, VehiculesRapports et tout futur
 * écran financier auto — ne pas recalculer indépendamment ailleurs
 * (voir roadmap item 17 : 3 définitions du CA avant cette source unique).
 * ============================================================== */

/** Montant contracté d'une location = jours × tarif journalier. */
export function rentalContractedAmount(r: Pick<Rental, "startDate" | "endDate" | "dailyRate">): number {
  const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
  return days * (r.dailyRate || 0);
}

/**
 * CA signé (contracté) sur une période : ventes véhicule (cash + crédit, montant
 * plein — le crédit n'est pas recompté à chaque échéance) + locations contractées.
 * Ne reflète PAS la trésorerie réelle encaissée (voir cashFlowInRange).
 * `inRange` reçoit la date métier brute (string) — laisse l'appelant choisir sa
 * propre stratégie de comparaison (clé "YYYY-MM", cutoff epoch, etc.) plutôt que
 * d'imposer un parsing de date qui décale les dates-seules (sans heure) selon le
 * fuseau de l'appareil.
 */
export function signedRevenueInRange(inRange: (isoDate: string) => boolean) {
  const saleRevenue = db.list("vehicleSales").filter((s) => inRange(s.date)).reduce((s, x) => s + x.amount, 0);
  const rentalRevenue = db.list("rentals").filter((r) => inRange(r.startDate)).reduce((s, r) => s + rentalContractedAmount(r), 0);
  return { saleRevenue, rentalRevenue, total: saleRevenue + rentalRevenue };
}

/**
 * Trésorerie réelle (mouvements de caisse) sur une période. Exclut les virements
 * internes entre comptes (`sourceType === "manual_cash_transfer"`) : un virement
 * Wave → Caisse principale n'est ni un encaissement ni un décaissement métier.
 */
export function cashFlowInRange(inRange: (isoDate: string) => boolean) {
  const moves = db.list("cash").filter((m) => m.sourceType !== "manual_cash_transfer" && inRange(m.date));
  const cashIn = moves.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const cashOut = moves.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);
  return { cashIn, cashOut, net: cashIn - cashOut };
}

/** Somme des paiements de crédit reçus sur une période (déjà comptés dans cashFlowInRange — informatif, pas à additionner au CA signé). */
export function creditPaymentsInRange(inRange: (isoDate: string) => boolean) {
  return db.list("vehiclePayments").filter((p) => inRange(p.date)).reduce((s, p) => s + p.amount, 0);
}

/** Solde total restant dû sur tous les crédits véhicule en cours. */
export function creditOutstandingTotal(): number {
  const payments = db.list("vehiclePayments");
  return db.list("vehicleCredits").reduce((s, c) => {
    const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((a, p) => a + p.amount, 0);
    return s + Math.max(0, c.total - paid);
  }, 0);
}

export function vehicleProfitability(vehicleId: string) {
  const v = db.list("vehicles").find((x) => x.id === vehicleId);
  if (!v) return null;
  const rentals = db.list("rentals").filter((r) => r.vehicleId === vehicleId);
  const sales = db.list("vehicleSales").filter((s) => s.vehicleId === vehicleId);
  const maints = db.list("vehicleMaintenances").filter((m) => m.vehicleId === vehicleId);
  const rentalRevenue = rentals.reduce((s, r) => s + rentalContractedAmount(r), 0);
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

