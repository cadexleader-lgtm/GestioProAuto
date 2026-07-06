/**
 * Lightweight role system (client-side, persisted in localStorage).
 * 3 rôles: Patron (tout), Manager (opérations, pas de suppression bulk),
 * Terrain (lecture + saisie basique).
 *
 * NB: c'est un garde-fou UX, pas une sécurité serveur. La vraie sécurité
 * reposera sur Supabase RLS quand les collections seront migrées.
 */
import { useSyncExternalStore } from "react";

export type Role = "patron" | "manager" | "terrain";

export interface RoleMeta {
  id: Role;
  label: string;
  description: string;
  color: string;
}

export const ROLES: RoleMeta[] = [
  { id: "patron",  label: "Patron",  description: "Accès complet — finances, suppressions, paramètres.", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "manager", label: "Manager", description: "Opérations quotidiennes — ventes, stock, clients.",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "terrain", label: "Terrain", description: "Saisie & consultation — pas d'accès finances.",       color: "bg-slate-100 text-slate-700 border-slate-200" },
];

const KEY = "gestiopro.role";
let current: Role = "patron";
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try { current = (window.localStorage.getItem(KEY) as Role) || "patron"; } catch {}
}
load();

export function setRole(r: Role) {
  current = r;
  try { window.localStorage.setItem(KEY, r); } catch {}
  listeners.forEach((l) => l());
}

export function useRole(): Role {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => "patron",
  );
}

/** Retourne true si le rôle peut effectuer une action donnée. */
export function can(role: Role, action:
  | "view.finance"
  | "delete.record"
  | "wipe.data"
  | "manage.settings"
  | "manage.credit"
  | "create.sale"
): boolean {
  if (role === "patron") return true;
  if (role === "manager") return action !== "wipe.data" && action !== "manage.settings";
  // terrain
  return action === "create.sale";
}
