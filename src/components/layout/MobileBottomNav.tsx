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

/**
 * Glassmorphism bottom navigation for mobile.
 * Shows the 4 most-used modules for the current sub-sector + Settings.
 */
export function MobileBottomNav() {
  const location = useLocation({ select: (s) => s.pathname });
  const { data: company } = useGetCompany();
  const sub = getSubSectorConfig(company?.subSectorId);

  // First 4 métier modules + settings entry
  const primary = sub.metierModules.slice(0, 4);
  const items = [
    ...primary,
    { href: "/app/parametres", iconName: "Settings", label: "Réglages" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <div className="mx-2 mb-2 rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shadow-[0_8px_32px_-8px_rgba(15,23,42,0.25)]">
        <ul className="flex items-stretch justify-around px-1.5 py-1.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
            const active = location === item.href;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  to={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-all",
                    active
                      ? "text-primary"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900",
                  )}
                >
                  {active && (
                    <span className="absolute inset-x-3 inset-y-1 rounded-2xl bg-primary/10" />
                  )}
                  <Icon size={20} className="relative z-10" strokeWidth={active ? 2.4 : 2} />
                  <span className="relative z-10 text-[10px] font-semibold leading-none truncate max-w-[60px]">
                    {item.label}
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
