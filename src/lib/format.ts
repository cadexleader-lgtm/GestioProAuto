import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatFCFA(value: number | undefined | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}

/** Nombre brut avec séparateurs de milliers (sans devise). */
export function formatNumber(value: number | undefined | null, digits = 0) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Formatage compact intelligent pour les grands montants :
 * 950 000 → « 950 000 », 1 250 000 → « 1,25 M », 3 400 000 000 → « 3,4 Md ».
 */
export function formatCompact(value: number | undefined | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const trim = (n: number) => formatNumber(n, n >= 100 ? 0 : n >= 10 ? 1 : 2).replace(/[.,]?0+$/, "");
  if (abs >= 1_000_000_000_000) return `${sign}${trim(abs / 1_000_000_000_000)} Bn`;
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} Md`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} M`;
  if (abs >= 100_000) return `${sign}${trim(abs / 1_000)} K`;
  return formatNumber(value);
}

/** Montant compact suffixé de la devise — pour les KPI et graphiques. */
export function formatFCFACompact(value: number | undefined | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "0 F";
  return `${formatCompact(value)} F`;
}

/** Choisit automatiquement entre affichage complet et compact selon la longueur. */
export function formatMoneyAuto(value: number | undefined | null, maxChars = 13) {
  const full = formatFCFA(value);
  return full.length > maxChars ? formatFCFACompact(value) : full;
}


export function formatDate(dateString: string | undefined | null, formatStr: string = "dd MMM yyyy, HH:mm") {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), formatStr, { locale: fr });
  } catch (e) {
    return dateString;
  }
}
