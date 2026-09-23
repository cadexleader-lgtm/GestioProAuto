/**
 * Source unique des statuts véhicule/location/maintenance/crédit — libellés,
 * couleurs et icônes. Avant ce fichier, le même statut véhicule s'affichait
 * "Disponible"/"Loué"/"Maintenance" sur le parc et la fiche détail mais
 * "Au parc"/"En location"/"Atelier" sur la carte GPS, et "En atelier" sur
 * le dashboard — même donnée, mots différents selon la page (roadmap
 * item 19). Toute page qui affiche un statut véhicule/location/maintenance
 * doit importer d'ici, jamais redéclarer son propre libellé.
 */
import type { Vehicle, Rental, VehicleCredit } from "@/lib/demo-data";
import type { VehicleMaintenance } from "@/lib/demo-store";
import {
  CheckCircle2, KeyRound, Wrench, ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export interface StatusMeta {
  label: string;
  /** Classes badge complètes (fond + texte + bordure). */
  badgeCls: string;
  dotCls: string;
  icon: LucideIcon;
}

export const VEHICLE_STATUS: Record<Vehicle["status"], StatusMeta> = {
  available:   { label: "Disponible",   badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200", dotCls: "bg-emerald-500", icon: CheckCircle2 },
  rented:      { label: "Loué",         badgeCls: "bg-indigo-100 text-indigo-700 border-indigo-200",    dotCls: "bg-indigo-500",  icon: KeyRound },
  maintenance: { label: "En maintenance", badgeCls: "bg-amber-100 text-amber-700 border-amber-200",     dotCls: "bg-amber-500",   icon: Wrench },
  sold:        { label: "Vendu",        badgeCls: "bg-slate-200 text-slate-700 border-slate-300",       dotCls: "bg-slate-500",   icon: ShoppingCart },
};

export type RentalDisplayStatus = Rental["status"] | "overdue";

export const RENTAL_STATUS: Record<RentalDisplayStatus, { label: string; cls: string }> = {
  reserved:  { label: "Réservé",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  active:    { label: "En cours",  cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  returned:  { label: "Retourné",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  overdue:   { label: "En retard", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Annulé",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const MAINTENANCE_STATUS: Record<VehicleMaintenance["status"], { label: string; cls: string }> = {
  pending:    { label: "En attente",     cls: "bg-slate-100 text-slate-700 border-slate-200" },
  diagnostic: { label: "Diagnostic",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  repair:     { label: "Réparation",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  parts_wait: { label: "Attente pièces", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  done:       { label: "Terminé",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/**
 * Un crédit "ok" en base reste "ok" même une fois intégralement payé — le
 * statut affiché doit distinguer "Soldé" (paid off) de "À jour" (en cours,
 * pas de retard), sans quoi un crédit terminé depuis des mois a l'air actif.
 */
export function creditStatusLabel(credit: VehicleCredit, paidAmount: number): { label: string; cls: string } {
  if (paidAmount >= credit.total) return { label: "Soldé", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (credit.status === "late") return { label: "En retard", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  return { label: "À jour", cls: "bg-slate-100 text-slate-700 border-slate-200" };
}
