/**
 * Feature Flags par organisation (item 22 roadmap) — le patron active/masque
 * les modules métier que son entreprise utilise réellement (ex. un loueur
 * pur n'a pas besoin du module Ventes, un revendeur cash n'a pas besoin du
 * Crédit). Stockage : table générique `company_settings` (existait déjà,
 * inexploitée — voir migration `20260924180000_add_feature_flags.sql`),
 * ligne fixe id="feature-flags". Écriture RPC-only (`set_feature_flags`,
 * réservée au patron) ; lecture directe via `useCollection("settings")`.
 */
import { useCollection } from "./demo-store";

export const FEATURE_FLAGS = [
  { key: "sales", label: "Ventes", description: "Vente cash de véhicules.", href: "/app/auto/ventes" },
  { key: "credit", label: "Ventes à crédit", description: "Vente échelonnée avec échéancier.", href: "/app/auto/credits" },
  { key: "rentals", label: "Locations", description: "Location courte/longue durée de véhicules.", href: "/app/auto/locations" },
  { key: "maintenance", label: "Maintenance", description: "Ouverture/clôture d'entretiens atelier.", href: "/app/auto/maintenance" },
  { key: "payroll", label: "Paie", description: "Paiement des salaires depuis Personnel." },
  { key: "documents", label: "Documents", description: "Centre documentaire (factures, contrats, bulletins)." , href: "/app/documents" },
  { key: "reports", label: "Rapports", description: "Rapports et export PDF.", href: "/app/auto/rapports" },
] as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[number]["key"];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  sales: true, credit: true, rentals: true, maintenance: true, payroll: true, documents: true, reports: true,
};

/** Modules toujours actifs, jamais proposés à la désactivation (coeur de l'app). */
export const ALWAYS_ON_HREFS = new Set(["/app", "/app/auto/vehicules", "/app/auto/gps", "/app/auto/clients"]);

export function useFeatureFlags(): FeatureFlags {
  const settings = useCollection("settings");
  const row = settings.find((s) => s.id === "feature-flags") as any;
  if (!row) return DEFAULT_FEATURE_FLAGS;
  return { ...DEFAULT_FEATURE_FLAGS, ...row };
}

/** Retire les modules désactivés d'une liste de liens de menu (par href). */
export function filterModulesByFlags<T extends { href: string }>(modules: T[], flags: FeatureFlags): T[] {
  const disabledHrefs = new Set(
    FEATURE_FLAGS.filter((f): f is typeof f & { href: string } => "href" in f && !flags[f.key]).map((f) => f.href),
  );
  return modules.filter((m) => !disabledHrefs.has(m.href));
}
