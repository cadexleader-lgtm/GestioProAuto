/**
 * Centre de notifications réactif et synchronisé.
 *
 * Les notifications sont DÉRIVÉES des données réelles de l'entreprise
 * (caisse, ventes véhicules, locations, crédits, maintenance, stock, dépenses).
 * Toast + bip uniquement pour les évènements survenus après l'hydratation,
 * afin de ne jamais spammer au chargement de la page.
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
  href?: string;
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
  items = [{ ...n, at: n.at ?? new Date().toISOString(), read: false }, ...items]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 120);
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
/* Générateur d'évènements — dérivé des données réelles                */
/* ------------------------------------------------------------------ */

type Candidate = Omit<AppNotification, "read"> & { toast?: { text: string; freq: number } };

const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

export function NotificationCenter() {
  const cash = useCollection("cash");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentals = useCollection("rentals");
  const vehicles = useCollection("vehicles");
  const vehicleSales = useCollection("vehicleSales");
  const products = useCollection("products");
  const appliances = useCollection("appliances");
  const maintenances = useCollection("vehicleMaintenances");
  const expenses = useCollection("expenses");

  const hydrated = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => { hydrated.current = true; }, 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const now = Date.now();
    const vName = (id: string) => {
      const v = vehicles.find((x) => x.id === id);
      return v ? `${v.brand} ${v.model} (${v.plate})` : "Véhicule";
    };
    const list: Candidate[] = [];

    /* --- Ventes de véhicules --- */
    vehicleSales.forEach((s) => {
      list.push({
        key: `vsale-${s.id}-${s.status}`,
        kind: "sale",
        href: "/app/auto/ventes",
        severity: s.status === "done" ? "success" : "info",
        at: s.date,
        title: s.status === "done"
          ? `Véhicule vendu — ${vName(s.vehicleId)}`
          : `Vente en cours — ${vName(s.vehicleId)}`,
        description: `${s.customer} · ${formatFCFA(s.amount)} · ${s.payment === "credit" ? "à crédit" : "comptant"}`,
        toast: { text: `🚗 Vente ${s.customer} — ${formatFCFA(s.amount)}`, freq: 900 },
      });
    });

    /* --- Locations : départ, retard, retour --- */
    rentals.forEach((r) => {
      const label = vName(r.vehicleId);
      if (r.returnedAt) {
        list.push({
          key: `rental-back-${r.id}`,
          kind: "rental",
          href: "/app/auto/locations",
          severity: "success",
          at: r.returnedAt,
          title: `Véhicule restitué — ${label}`,
          description: `${r.customer} · retour le ${d(r.returnedAt)}`,
          toast: { text: `✅ Retour véhicule — ${r.customer}`, freq: 760 },
        });
        return;
      }
      list.push({
        key: `rental-start-${r.id}`,
        kind: "rental",
        severity: "info",
        at: r.startDate,
        title: `Location en cours — ${label}`,
        description: `${r.customer} · retour prévu le ${d(r.endDate)}`,
        toast: { text: `🔑 Location démarrée — ${r.customer}`, freq: 820 },
      });
      if (isRentalOverdue(r)) {
        list.push({
          key: `rental-late-${r.id}-${r.endDate}`,
          kind: "rental",
          href: "/app/auto/locations",
          severity: "danger",
          at: r.endDate,
          title: `Retour en retard — ${label}`,
          description: `${r.customer} · devait rentrer le ${d(r.endDate)}`,
          toast: { text: `🚨 Retour en retard — ${r.customer}`, freq: 500 },
        });
      }
    });

    /* --- Véhicules immobilisés / maintenance --- */
    maintenances.forEach((m) => {
      const label = vName(m.vehicleId);
      const cost = (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0);
      if (m.status === "done") {
        list.push({
          key: `maint-done-${m.id}`,
          kind: "maintenance",
          href: "/app/auto/maintenance",
          severity: "success",
          at: m.dateOut || m.dateIn,
          title: `Maintenance terminée — ${label}`,
          description: `${m.motif} · coût ${formatFCFA(cost)}`,
          toast: { text: `🔧 Maintenance terminée — ${label}`, freq: 700 },
        });
      } else {
        list.push({
          key: `maint-open-${m.id}`,
          kind: "maintenance",
          href: "/app/auto/maintenance",
          severity: "warning",
          at: m.dateIn,
          title: `Véhicule immobilisé — ${label}`,
          description: `${m.motif} · ${m.garage || "Atelier"} depuis le ${d(m.dateIn)}`,
          toast: { text: `🔧 Immobilisation — ${label}`, freq: 620 },
        });
      }
    });

    /* --- Crédits véhicules --- */
    credits.forEach((c) => {
      const cPays = payments.filter((p) => p.creditId === c.id);
      const paid = c.downPayment + cPays.reduce((s, p) => s + p.amount, 0);
      cPays.forEach((p) => {
        list.push({
          key: `vpay-${p.id}`,
          kind: "credit",
          href: "/app/auto/credits",
          severity: "success",
          at: p.date,
          title: `Versement reçu — ${c.customer}`,
          description: `${formatFCFA(p.amount)} · ${p.method}`,
          toast: { text: `💵 Versement ${c.customer} — ${formatFCFA(p.amount)}`, freq: 880 },
        });
      });
      if (paid >= c.total) {
        list.push({
          key: `credit-done-${c.id}`,
          kind: "credit",
          href: "/app/auto/credits",
          severity: "success",
          at: cPays.length ? cPays[cPays.length - 1].date : c.nextDueDate,
          title: `Crédit soldé — ${c.customer}`,
          description: `Contrat terminé · ${formatFCFA(c.total)}`,
          toast: { text: `🎉 Crédit soldé — ${c.customer}`, freq: 990 },
        });
        return;
      }
      const due = +new Date(c.nextDueDate);
      if (due < now) {
        list.push({
          key: `credit-late-${c.id}-${c.nextDueDate}`,
          kind: "credit",
          href: "/app/auto/credits",
          severity: "danger",
          at: c.nextDueDate,
          title: `Crédit en retard — ${c.customer}`,
          description: `Échéance du ${d(c.nextDueDate)} · reste ${formatFCFA(c.total - paid)}`,
          toast: { text: `⏰ Crédit en retard — ${c.customer}`, freq: 440 },
        });
      } else if (due - now < 3 * 86400000) {
        list.push({
          key: `credit-soon-${c.id}-${c.nextDueDate}`,
          kind: "credit",
          href: "/app/auto/credits",
          severity: "warning",
          at: new Date().toISOString(),
          title: `Échéance proche — ${c.customer}`,
          description: `${formatFCFA(c.monthlyPayment)} le ${d(c.nextDueDate)}`,
        });
      }
    });

    /* --- Caisse --- */
    cash.forEach((m) => {
      const inflow = m.type === "in";
      list.push({
        key: `cash-${m.id}`,
        kind: inflow ? "sale" : "expense",
        href: "/app/tresorerie",
        severity: inflow ? "success" : "info",
        at: (m as any).date || new Date().toISOString(),
        title: `${inflow ? "Encaissement" : "Décaissement"} ${inflow ? "+" : "−"}${formatFCFA(m.amount)}`,
        description: `${m.label} · ${m.source}`,
        toast: { text: `${inflow ? "💰 +" : "↗ −"}${formatFCFA(m.amount)} · ${m.label}`, freq: inflow ? 880 : 520 },
      });
    });

    /* --- Dépenses --- */
    expenses.forEach((e) => {
      list.push({
        key: `exp-${e.id}`,
        kind: "expense",
        href: "/app/depenses",
        severity: "info",
        at: (e as any).date || new Date().toISOString(),
        title: `Dépense — ${e.category}`,
        description: `${e.label} · ${formatFCFA(e.amount)}`,
      });
    });

    /* --- Stock bas --- */
    [...products, ...appliances].forEach((p: any) => {
      const min = typeof p.minStock === "number" ? p.minStock : 3;
      if (typeof p.stock !== "number" || p.stock > min) return;
      list.push({
        key: `stock-${p.id}-${p.stock}`,
        kind: "stock",
        href: "/app/stock",
        severity: p.stock === 0 ? "danger" : "warning",
        at: new Date().toISOString(),
        title: `${p.stock === 0 ? "Rupture" : "Stock bas"} — ${p.name}`,
        description: `Reste ${p.stock} unité(s)`,
        toast: { text: `📦 ${p.stock === 0 ? "Rupture" : "Stock bas"} — ${p.name}`, freq: 660 },
      });
    });

    // Publication : les plus anciens d'abord pour un ordre cohérent.
    list.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    let toasted = 0;
    list.forEach((c) => {
      const added = pushNotification({
        key: c.key, kind: c.kind, title: c.title,
        description: c.description, severity: c.severity, at: c.at, href: c.href,
      });
      if (added && hydrated.current && c.toast && toasted < 3) {
        toasted++;
        const fn = c.severity === "danger" ? toast.warning : c.severity === "success" ? toast.success : toast.message;
        fn(c.toast.text);
        beep(c.toast.freq, 120);
      }
    });
  }, [cash, credits, payments, rentals, vehicles, vehicleSales, products, appliances, maintenances, expenses]);

  return null;
}
