/**
 * Centre de notifications réactives.
 * Surveille les collections critiques et émet un toast + un son court
 * quand un événement important se produit (nouvelle vente, crédit en
 * retard, stock bas, maintenance terminée).
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCollection } from "./demo-store";
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

export function NotificationCenter() {
  const cash = useCollection("cash");
  const credits = useCollection("vehicleCredits");
  const products = useCollection("appliances");
  const first = useRef(true);
  const lastCashId = useRef<string | null>(null);
  const alertedCredits = useRef<Set<string>>(new Set());
  const alertedStock = useRef<Set<string>>(new Set());

  // Nouvelle entrée caisse
  useEffect(() => {
    if (first.current) {
      first.current = false;
      lastCashId.current = cash[0]?.id ?? null;
      return;
    }
    const top = cash[0];
    if (top && top.id !== lastCashId.current) {
      lastCashId.current = top.id;
      if (top.type === "in") {
        toast.success(`💰 +${formatFCFA(top.amount)}`, { description: top.label });
        beep(880, 100);
      }
    }
  }, [cash]);

  // Crédits en retard
  useEffect(() => {
    const now = Date.now();
    credits.forEach((c) => {
      const overdue = +new Date(c.nextDueDate) < now && c.paidMonths < c.totalMonths;
      if (overdue && !alertedCredits.current.has(c.id)) {
        alertedCredits.current.add(c.id);
        toast.warning(`⏰ Crédit en retard — ${c.customer}`, {
          description: `Échéance ${new Date(c.nextDueDate).toLocaleDateString("fr-FR")}`,
        });
        beep(440, 200);
      }
    });
  }, [credits]);

  // Stock bas
  useEffect(() => {
    products.forEach((p: any) => {
      if (typeof p.stock === "number" && typeof p.minStock === "number"
          && p.stock <= p.minStock && !alertedStock.current.has(p.id)) {
        alertedStock.current.add(p.id);
        toast.warning(`📦 Stock bas — ${p.name}`, {
          description: `Reste ${p.stock} unité(s)`,
        });
        beep(660, 150);
      }
    });
  }, [products]);

  return null;
}
