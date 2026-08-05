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

import { useGetCompany, useGetDashboard } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { getSubSectorConfig, getCrossModules } from "@/lib/sectors";
import logoIcon from "@/assets/gestiopro-icon.png";

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
  const { data: dashboard } = useGetDashboard();
  const sub = getSubSectorConfig(company?.subSectorId);
  const [hovered, setHovered] = useState(false);

  const alertsCount = dashboard?.lowStock?.length || 0;
  // On mobile: expanded when isOpen. On desktop: expanded on hover.
  const expanded = isOpen || hovered;

  const renderItem = (item: typeof sub.metierModules[number]) => {
    const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
    const active = location === item.href;
    const showBadge = item.badge === "alerts" && alertsCount > 0;
    return (
      <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)} className="block" title={!expanded ? item.label : undefined}>
        <div className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative cursor-pointer",
          active ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
        )}>
          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />}
          <Icon size={18} className="shrink-0" />
          <span className={cn("text-sm truncate flex-1 transition-opacity duration-200", !expanded && "md:opacity-0 md:pointer-events-none")}>{item.label}</span>
          {showBadge && (
            <span className={cn(
              "ml-auto bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 transition-opacity",
              !expanded && "md:opacity-0"
            )}>
              {alertsCount}
            </span>
          )}
          {!expanded && showBadge && (
            <span className="hidden md:block absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop spacer to reserve mini-rail width in the flex layout */}
      <div className="hidden md:block shrink-0 w-16" aria-hidden="true" />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
          // Mobile: full width drawer, slides in/out
          "w-64 md:w-16",
          expanded && "md:w-64 md:shadow-xl",
          !isOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0 overflow-hidden">
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <img src={logoIcon} alt="GestioPro" className="w-8 h-8 rounded-lg shrink-0" />
            <div className={cn("flex flex-col leading-tight transition-opacity duration-200", !expanded && "md:opacity-0 md:pointer-events-none")}>
              <span className="font-display font-bold text-base text-sidebar-foreground whitespace-nowrap">GestioPro</span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium whitespace-nowrap">ERP Suite</span>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub-sector badge */}
        <div className={cn("px-4 pt-4 pb-2 transition-all duration-200 overflow-hidden", !expanded && "md:px-2 md:pt-3")}>
          <div className={cn(
            "rounded-lg border border-primary/15 bg-primary/5 transition-all",
            expanded ? "px-3 py-2" : "md:px-0 md:py-2 md:flex md:justify-center"
          )}>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider text-primary/70 transition-opacity", !expanded && "md:hidden")}>Activité</p>
            <p className={cn("text-sm font-semibold text-sidebar-foreground mt-0.5 truncate transition-opacity", !expanded && "md:hidden")}>{sub.label}</p>
            {!expanded && (
              <span className="hidden md:block text-[10px] font-bold text-primary uppercase tracking-wider">{sub.label.charAt(0)}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 space-y-0.5 custom-scrollbar">
          <p className={cn("text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-2 mb-1 transition-opacity", !expanded && "md:opacity-0")}>Métier</p>
          {sub.metierModules.map(renderItem)}

          <p className={cn("text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-4 mb-1 transition-opacity", !expanded && "md:opacity-0")}>Transversal</p>
          {getCrossModules(company?.subSectorId).map(renderItem)}

          <p className={cn("text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-4 mb-1 transition-opacity", !expanded && "md:opacity-0")}>Entreprise</p>
          <Link to="/app/parametres" onClick={() => setIsOpen(false)} className="block" title={!expanded ? "Paramètres" : undefined}>
            <div className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer",
              location === "/app/parametres" ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
            )}>
              <Settings size={18} className="shrink-0" />
              <span className={cn("text-sm truncate transition-opacity", !expanded && "md:opacity-0 md:pointer-events-none")}>Paramètres</span>
            </div>
          </Link>
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0 overflow-hidden">
          <div className={cn("flex items-center gap-3 rounded-lg p-2 bg-sidebar-accent/50", !expanded && "md:p-1 md:bg-transparent md:justify-center")}>
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-sm">
              {company?.ownerName?.charAt(0) || "G"}
            </div>
            <div className={cn("flex flex-col min-w-0 transition-opacity duration-200", !expanded && "md:opacity-0 md:pointer-events-none md:w-0")}>
              <span className="text-xs font-semibold text-sidebar-foreground truncate whitespace-nowrap">
                {company?.ownerName || "Utilisateur"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate whitespace-nowrap">{company?.name}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
