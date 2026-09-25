import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Car, ShoppingCart, CreditCard, KeyRound, Users2, Truck, FileText, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useCollection } from "@/lib/demo-store";
import { useRole } from "@/lib/roles";
import { formatFCFA } from "@/lib/format";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchCategory {
  id: string;
  label: string;
  icon: ReactNode;
  results: SearchResult[];
}

const MAX_PER_CATEGORY = 6;

function norm(s: string | number | undefined | null) {
  return String(s ?? "").toLowerCase();
}

function matches(query: string, fields: Array<string | undefined | null>) {
  return fields.some((f) => norm(f).includes(query));
}

/** Barre de recherche globale : filtre en direct sur les collections locales déjà
 * chargées (pas de requête réseau dédiée) et navigue vers la page concernée au clic.
 * Les catégories financières (ventes, crédits, personnel, documents) sont masquées
 * pour le rôle terrain, cohérent avec le reste de l'app (cf. roles.ts:can()). */
export function TopbarSearch() {
  const navigate = useNavigate();
  const role = useRole();
  const canFinance = role !== "terrain";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const vehicles = useCollection("vehicles");
  const vehicleSales = useCollection("vehicleSales");
  const vehicleCredits = useCollection("vehicleCredits");
  const rentals = useCollection("rentals");
  const employees = useCollection("employees");
  const suppliers = useCollection("suppliers");
  const documents = useCollection("documents");

  const trimmed = query.trim();

  const categories = useMemo<SearchCategory[]>(() => {
    const q = trimmed.toLowerCase();
    if (!q) return [];

    const list: SearchCategory[] = [];

    const vehicleResults = vehicles
      .filter((v) => matches(q, [v.brand, v.model, v.plate, v.vin, v.color]))
      .slice(0, MAX_PER_CATEGORY)
      .map((v) => ({ id: v.id, label: `${v.brand} ${v.model}`.trim(), sublabel: v.plate || v.vin, href: "/app/auto/vehicules" }));
    if (vehicleResults.length) {
      list.push({ id: "vehicles", label: "Véhicules", icon: <Car size={14} />, results: vehicleResults });
    }

    if (canFinance) {
      const saleResults = vehicleSales
        .filter((s) => matches(q, [s.customer, s.phone]))
        .slice(0, MAX_PER_CATEGORY)
        .map((s) => ({ id: s.id, label: s.customer, sublabel: `Vente · ${formatFCFA(s.amount)}`, href: "/app/auto/ventes" }));
      if (saleResults.length) {
        list.push({ id: "sales", label: "Ventes", icon: <ShoppingCart size={14} />, results: saleResults });
      }

      const creditResults = vehicleCredits
        .filter((c) => matches(q, [c.customer]))
        .slice(0, MAX_PER_CATEGORY)
        .map((c) => ({ id: c.id, label: c.customer, sublabel: `Crédit · ${c.status === "late" ? "en retard" : "à jour"}`, href: "/app/auto/credits" }));
      if (creditResults.length) {
        list.push({ id: "credits", label: "Crédits", icon: <CreditCard size={14} />, results: creditResults });
      }
    }

    const rentalResults = rentals
      .filter((r) => matches(q, [r.customer, r.phone]))
      .slice(0, MAX_PER_CATEGORY)
      .map((r) => ({ id: r.id, label: r.customer, sublabel: "Location", href: "/app/auto/locations" }));
    if (rentalResults.length) {
      list.push({ id: "rentals", label: "Locations", icon: <KeyRound size={14} />, results: rentalResults });
    }

    if (canFinance) {
      const employeeResults = employees
        .filter((e) => matches(q, [`${e.firstName} ${e.lastName}`, e.position]))
        .slice(0, MAX_PER_CATEGORY)
        .map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}`.trim(), sublabel: e.position, href: "/app/personnel" }));
      if (employeeResults.length) {
        list.push({ id: "employees", label: "Personnel", icon: <Users2 size={14} />, results: employeeResults });
      }

      const documentResults = documents
        .filter((d) => matches(q, [d.reference, d.title]))
        .slice(0, MAX_PER_CATEGORY)
        .map((d) => ({ id: d.id, label: d.title || d.reference, sublabel: d.reference, href: "/app/documents" }));
      if (documentResults.length) {
        list.push({ id: "documents", label: "Documents", icon: <FileText size={14} />, results: documentResults });
      }
    }

    const supplierResults = suppliers
      .filter((s) => matches(q, [s.name, s.company, s.contact]))
      .slice(0, MAX_PER_CATEGORY)
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.company, href: "/app/fournisseurs" }));
    if (supplierResults.length) {
      list.push({ id: "suppliers", label: "Fournisseurs", icon: <Truck size={14} />, results: supplierResults });
    }

    return list;
  }, [trimmed, vehicles, vehicleSales, vehicleCredits, rentals, employees, suppliers, documents, canFinance]);

  const totalResults = categories.reduce((n, c) => n + c.results.length, 0);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: href });
  };

  return (
    <Popover open={open && trimmed.length > 0} onOpenChange={(o) => setOpen(o)}>
      <PopoverAnchor asChild>
        <div data-tour="topbar-search" className="h-9 items-center px-3 bg-card rounded-lg border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all max-w-md w-full sm:w-64 hidden sm:flex">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (trimmed.length > 0) setOpen(true);
            }}
            placeholder="Rechercher un véhicule, un client…"
            className="text-sm px-2 w-full bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[min(90vw,22rem)] p-0 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {totalResults === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground px-6">
              Aucun résultat pour « {trimmed} ».
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="border-b last:border-b-0">
                <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.icon} {cat.label}
                </div>
                <ul>
                  {cat.results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => go(r.href)}
                        className="w-full text-left px-4 py-2 hover:bg-muted/60 transition-colors"
                      >
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.sublabel && <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
