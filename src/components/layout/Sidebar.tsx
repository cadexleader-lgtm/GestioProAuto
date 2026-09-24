import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, X,
  UtensilsCrossed, Grid3x3, ChefHat, ClipboardList, CalendarDays,
  ShoppingBag, Building2, Stethoscope, Smartphone,
  Truck, Users2, Receipt, Wallet, BarChart3,
  Car, KeyRound, MapPin, CreditCard, ShieldCheck, FileSpreadsheet, Tv, Tags, Wrench,
  type LucideIcon,
} from "lucide-react";

import { useGetCompany } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { getSubSectorConfig, getCrossModules } from "@/lib/sectors";
import { useFeatureFlags, filterModulesByFlags } from "@/lib/feature-flags";
import logoIcon from "@/assets/gestiopro-icon.webp";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings,
  UtensilsCrossed, Grid3x3, ChefHat, ClipboardList, CalendarDays,
  ShoppingBag, Building2, Stethoscope, Smartphone,
  Truck, Users2, Receipt, Wallet, BarChart3,
  Car, KeyRound, MapPin, CreditCard, ShieldCheck, FileSpreadsheet, Tv, Tags, Wrench,
};

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation({ select: (s) => s.pathname });
  const { data: company } = useGetCompany();
  const sub = getSubSectorConfig(company?.subSectorId);
  const flags = useFeatureFlags();
  const [hovered, setHovered] = useState(false);

  // Mobile: expanded when isOpen. Desktop: expanded on hover.
  const expanded = isOpen || hovered;

  const renderItem = (item: { href: string; iconName: string; label: string }) => {
    const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
    const active = location === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setIsOpen(false)}
        title={!expanded ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl h-10 px-2 transition-colors duration-200",
          active
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all duration-200",
            active ? "h-5 opacity-100" : "h-0 opacity-0",
          )}
        />
        <span
          className={cn(
            "grid place-items-center h-8 w-8 shrink-0 rounded-lg transition-colors",
            active ? "bg-primary/15 text-primary" : "text-current group-hover:bg-sidebar-accent",
          )}
        >
          <Icon size={17} strokeWidth={active ? 2.4 : 1.9} />
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px] transition-all duration-200",
            active ? "font-semibold" : "font-medium",
            !expanded && "md:opacity-0 md:pointer-events-none",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  const sectionLabel = (label: string) => (
    <div className="px-2 pt-4 pb-1.5">
      {expanded ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/40">{label}</p>
      ) : (
        <div className="hidden md:block mx-auto h-px w-6 bg-sidebar-border" />
      )}
      {expanded ? null : <p className="md:hidden text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/40">{label}</p>}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop spacer reserving the mini-rail width */}
      <div className="hidden md:block shrink-0 w-[68px]" aria-hidden="true" />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 border-r border-sidebar-border",
          "bg-sidebar/95 backdrop-blur-xl transition-[width,transform] duration-300 ease-out",
          "w-[264px] md:w-[68px]",
          expanded && "md:w-[248px] md:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]",
          !isOpen && "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="h-16 shrink-0 flex items-center gap-2 px-3 border-b border-sidebar-border overflow-hidden">
          <Link to="/app" className="flex items-center gap-2.5 min-w-0 flex-1">
            <img src={logoIcon} alt="GestioPro" className="h-9 w-9 shrink-0 rounded-xl shadow-sm" />
            <span
              className={cn(
                "flex min-w-0 flex-col leading-tight transition-opacity duration-200",
                !expanded && "md:opacity-0 md:pointer-events-none",
              )}
            >
              <span className="font-display text-[15px] font-bold text-sidebar-foreground truncate">GestioPro</span>
              <span className="text-[10px] font-medium text-sidebar-foreground/50 truncate">{sub.label}</span>
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 custom-scrollbar space-y-0.5">
          {sectionLabel("Métier")}
          {filterModulesByFlags(sub.metierModules, flags).map(renderItem)}

          {sectionLabel("Transversal")}
          {filterModulesByFlags(getCrossModules(company?.subSectorId), flags).map(renderItem)}

          {sectionLabel("Entreprise")}
          {renderItem({ href: "/app/parametres", iconName: "Settings", label: "Paramètres" })}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-sidebar-border p-2.5">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl p-1.5 transition-colors",
              expanded ? "bg-sidebar-accent/60" : "md:justify-center",
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {company?.ownerName?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-col transition-opacity duration-200",
                !expanded && "md:w-0 md:opacity-0 md:pointer-events-none",
              )}
            >
              <span className="truncate text-xs font-semibold text-sidebar-foreground">
                {company?.ownerName || "Utilisateur"}
              </span>
              <span className="truncate text-[11px] text-sidebar-foreground/60">{company?.name}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
