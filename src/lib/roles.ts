/**
 * Client-side role display backed by the authenticated tenant membership.
 * 3 rôles: Patron (tout), Manager (opérations, pas de suppression bulk),
 * Terrain (lecture + saisie basique).
 */
import { useTenant } from "./tenant";

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

export function useRole(): Role {
  return useTenant().role ?? "terrain";
}

/** Retourne true si le rôle peut effectuer une action donnée. */
export function can(role: Role, action:
  | "view.finance"
  | "delete.record"
  | "wipe.data"
  | "manage.settings"
  | "manage.credit"
  | "manage.payroll"
  | "create.sale"
): boolean {
  if (role === "patron") return true;
  if (role === "manager") return action !== "wipe.data" && action !== "manage.settings";
  // terrain : saisie & consultation, aucun accès finances (vente, crédit, paie,
  // trésorerie) — cohérent avec ce que les RPC financières exigent déjà côté serveur
  // (company_role_at_least('manager')).
  return false;
}
