/**
 * Bornes de période précises (heure locale, pas UTC) pour la Trésorerie —
 * remplace l'ancien filtre par préfixe de chaîne (`d.startsWith(todayKey)`,
 * basé sur `toISOString()` donc en UTC) qui pouvait décaler "aujourd'hui"
 * de plusieurs heures selon le fuseau. Semaine = Lundi→Dimanche (convention
 * française), pas les 7 derniers jours glissants.
 */
export type FinancePeriod = "day" | "week" | "month" | "year";

export interface PeriodRange {
  /** Inclusif */
  start: Date;
  /** Exclusif */
  end: Date;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lundi = début de semaine. `getDay()` renvoie 0=dimanche..6=samedi. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(x, diff);
}

const CAP = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function getPeriodRange(period: FinancePeriod, offset: number, reference: Date = new Date()): PeriodRange {
  if (period === "day") {
    const start = addDays(startOfDay(reference), offset);
    const end = addDays(start, 1);
    return { start, end, label: CAP(start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })) };
  }
  if (period === "week") {
    const start = addDays(startOfWeek(reference), offset * 7);
    const end = addDays(start, 7);
    const lastDay = addDays(end, -1);
    const label = `${start.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })} – ${lastDay.getDate()} ${lastDay.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;
    return { start, end, label };
  }
  if (period === "month") {
    const ref = new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    return { start, end, label: CAP(start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })) };
  }
  // year
  const year = reference.getFullYear() + offset;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return { start, end, label: String(year) };
}

export function inRange(dateIso: string, range: PeriodRange): boolean {
  const t = +new Date(dateIso);
  return t >= +range.start && t < +range.end;
}
