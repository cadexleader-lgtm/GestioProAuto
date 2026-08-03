/**
 * Centre de notifications réactif et synchronisé.
 *
 * - Un store en mémoire (liste des notifications) alimenté par les données
 *   réelles de l'entreprise (caisse, crédits, locations, stock, maintenance).
 * - Un toast + un bip court pour les évènements « live ».
 * - Le composant <NotificationsBell /> affiche le flux complet.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useCollection, isRentalOverdue } from "./demo-store";
import { formatFCFA } from "./format";

const SOUND_KEY = "gestiopro.sound";
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { window.localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch {}
}

function beep(freq = 880, ms = 120) {
  if (!isSoundEnabled()) return;
  try {
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, ms);
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export type NotifKind = "sale" | "credit" | "rental" | "stock" | "maintenance" | "expense" | "info";

export interface AppNotification {
  key: string;            // clé de déduplication
  kind: NotifKind;
  title: string;
  description?: string;
  at: string;             // ISO
  read: boolean;
  severity: "info" | "success" | "warning" | "danger";
}

let items: AppNotification[] = [];
const listeners = new Set<() => void>();
const EMPTY: AppNotification[] = [];

function emit() {
  items = [...items];
  listeners.forEach((l) => l());
}

export function pushNotification(n: Omit<AppNotification, "read" | "at"> & { at?: string }) {
  if (items.some((x) => x.key === n.key)) return false;
  items = [{ ...n, at: n.at ?? new Date().toISOString(), read: false }, ...items].slice(0, 80);
  listeners.forEach((l) => l());
  return true;
}

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => items,
    () => EMPTY,
  );
}

export function markAllRead() {
  items = items.map((n) => ({ ...n, read: true }));
  emit();
}

export function clearNotifications() {
  items = [];
  emit();
}

export function clearNotificationStore() {
  clearNotifications();
}

/* ------------------------------------------------------------------ */
/* Générateur d'évènements — branché sur les données réelles           */
/* ------------------------------------------------------------------ */

export function NotificationCenter() {
  const cash = useCollection("cash");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentals = useCollection("rentals");
  const products = useCollection("products");
  const appliances = useCollection("appliances");
  const maintenances = useCollection("vehicleMaintenances");
  const expenses = useCollection("expenses");

  const booted = useRef(false);
  const seenCash = useRef<Set<string>>(new Set());
  const seenExpense = useRef<Set<string>>(new Set());

  // Amorçage : on n'alerte pas sur l'historique déjà présent au chargement.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    cash.forEach((c) => seenCash.current.add(c.id));
    expenses.forEach((e) => seenExpense.current.add(e.id));
  }, [cash, expenses]);

  // Encaissements
  useEffect(() => {
    if (!booted.current) return;
    cash.forEach((m) => {
      if (seenCash.current.has(m.id)) return;
      seenCash.current.add(m.id);
      const inflow = m.type === "in";
      const ok = pushNotification({
        key: `cash-${m.id}`,
        kind: "sale",
        severity: inflow ? "success" : "info",
        title: `${inflow ? "Encaissement" : "Décaissement"} ${inflow ? "+" : "−"}${formatFCFA(m.amount)}`,
        description: `${m.label} · ${m.source}`,
      });
      if (ok) {
        if (inflow) toast.success(`💰 +${formatFCFA(m.amount)}`, { description: m.label });
        else toast.message(`↗ −${formatFCFA(m.amount)}`, { description: m.label });
        beep(inflow ? 880 : 520, 100);
      }
    });
  }, [cash]);

  // Dépenses enregistrées
  useEffect(() => {
    if (!booted.current) return;
    expenses.forEach((e) => {
      if (seenExpense.current.has(e.id)) return;
      seenExpense.current.add(e.id);
      pushNotification({
        key: `exp-${e.id}`,
        kind: "expense",
        severity: "info",
        title: `Dépense — ${e.category}`,
        description: `${e.label} · ${formatFCFA(e.amount)}`,
      });
    });
  }, [expenses]);

  // Crédits : retard + solde
  useEffect(() => {
    const now = Date.now();
    credits.forEach((c) => {
      const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((s, p) => s + p.amount, 0);
      if (paid >= c.total) {
        pushNotification({
          key: `credit-done-${c.id}`,
          kind: "credit",
          severity: "success",
          title: `Crédit soldé — ${c.customer}`,
          description: `Contrat terminé · ${formatFCFA(c.total)}`,
        });
        return;
      }
      const due = +new Date(c.nextDueDate);
      if (due < now) {
        const ok = pushNotification({
          key: `credit-late-${c.id}-${c.nextDueDate}`,
          kind: "credit",
          severity: "danger",
          title: `Crédit en retard — ${c.customer}`,
          description: `Échéance du ${new Date(c.nextDueDate).toLocaleDateString("fr-FR")} · reste ${formatFCFA(c.total - paid)}`,
        });
        if (ok) { toast.warning(`⏰ Crédit en retard — ${c.customer}`); beep(440, 200); }
      } else if (due - now < 3 * 86400000) {
        pushNotification({
          key: `credit-soon-${c.id}-${c.nextDueDate}`,
          kind: "credit",
          severity: "warning",
          title: `Échéance proche — ${c.customer}`,
          description: `${formatFCFA(c.monthlyPayment)} le ${new Date(c.nextDueDate).toLocaleDateString("fr-FR")}`,
        });
      }
    });
  }, [credits, payments]);

  // Locations en retard
  useEffect(() => {
    rentals.forEach((r) => {
      if (!isRentalOverdue(r)) return;
      const ok = pushNotification({
        key: `rental-late-${r.id}-${r.endDate}`,
        kind: "rental",
        severity: "danger",
        title: `Retour en retard — ${r.customer}`,
        description: `Retour prévu le ${new Date(r.endDate).toLocaleDateString("fr-FR")}`,
      });
      if (ok) { toast.warning(`🚗 Retour en retard — ${r.customer}`); beep(500, 180); }
    });
  }, [rentals]);

  // Stock bas (boutique + électroménager)
  useEffect(() => {
    [...products, ...appliances].forEach((p: any) => {
      const min = typeof p.minStock === "number" ? p.minStock : 3;
      if (typeof p.stock !== "number" || p.stock > min) return;
      const ok = pushNotification({
        key: `stock-${p.id}-${p.stock}`,
        kind: "stock",
        severity: p.stock === 0 ? "danger" : "warning",
        title: `${p.stock === 0 ? "Rupture" : "Stock bas"} — ${p.name}`,
        description: `Reste ${p.stock} unité(s)`,
      });
      if (ok) { toast.warning(`📦 ${p.stock === 0 ? "Rupture" : "Stock bas"} — ${p.name}`); beep(660, 150); }
    });
  }, [products, appliances]);

  // Maintenances
  useEffect(() => {
    maintenances.forEach((m) => {
      if (m.status === "done") {
        pushNotification({
          key: `maint-done-${m.id}`,
          kind: "maintenance",
          severity: "success",
          title: `Maintenance terminée — ${m.motif}`,
          description: `Coût ${formatFCFA((m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0))}`,
        });
      } else {
        pushNotification({
          key: `maint-open-${m.id}`,
          kind: "maintenance",
          severity: "warning",
          title: `Véhicule immobilisé — ${m.motif}`,
          description: `${m.garage || "Atelier"} · depuis le ${new Date(m.dateIn).toLocaleDateString("fr-FR")}`,
        });
      }
    });
  }, [maintenances]);

  return null;
}
