import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatFCFA(value: number | undefined | null) {
  if (value === undefined || value === null) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}

export function formatDate(dateString: string | undefined | null, formatStr: string = "dd MMM yyyy, HH:mm") {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), formatStr, { locale: fr });
  } catch (e) {
    return dateString;
  }
}
