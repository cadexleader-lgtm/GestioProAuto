import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Settings,
  UtensilsCrossed, ClipboardList, ChefHat, Grid3x3,
  Car, KeyRound, CreditCard, Wrench,
  ShieldCheck, FileSpreadsheet, Tv,
  type LucideIcon,
} from "lucide-react";
import { useGetCompany } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { getSubSectorConfig } from "@/lib/sectors";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Package, Users, Settings,
  UtensilsCrossed, ClipboardList, ChefHat, Grid3x3,
  Car, KeyRound, CreditCard, Wrench,
  ShieldCheck, FileSpreadsheet, Tv,
};

/** Shortens long module labels so they stay readable in the mobile tab bar. */
function shortLabel(label: string) {
  const cleaned = label
    .replace(/^Tableau de bord.*$/i, "Accueil")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim();
  const first = cleaned.split(/\s+/)[0];
  return first.length > 9 ? `${first.slice(0, 8)}.` : first;
}

/**
 * Glassmorphism bottom navigation for mobile.
 * Shows the 4 most-used modules for the current sub-sector + Settings.
 */
export function MobileBottomNav() {
  const location = useLocation({ select: (s) => s.pathname });
  const { data: company } = useGetCompany();
  const sub = getSubSectorConfig(company?.subSectorId);

  const primary = sub.metierModules.slice(0, 4);
  const items = [
    ...primary,
    { href: "/app/parametres", iconName: "Settings", label: "Réglages" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
      aria-label="Navigation principale"
    >
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/70 to-transparent" />

      <div className="relative pointer-events-auto px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ul className="grid grid-cols-5 gap-1 rounded-[26px] border border-white/50 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] p-1.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
            const active = location === item.href;
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  to={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-[20px] px-0.5 py-2 min-w-0 transition-colors duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-[20px] bg-primary/10 ring-1 ring-primary/20" />
                  )}
                  <Icon
                    size={20}
                    className={cn("relative z-10 shrink-0 transition-transform", active && "scale-110")}
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  <span
                    className={cn(
                      "relative z-10 block w-full truncate text-center text-[10px] leading-tight tracking-tight",
                      active ? "font-bold" : "font-medium",
                    )}
                  >
                    {shortLabel(item.label)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
