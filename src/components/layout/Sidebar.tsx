import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, X,
  UtensilsCrossed, Grid3x3, ChefHat, ClipboardList, CalendarDays,
  ShoppingBag, Building2, Stethoscope, Smartphone,
  Truck, Users2, Receipt, Wallet, BarChart3,
  Car, KeyRound, MapPin, CreditCard, ShieldCheck, FileSpreadsheet, Tv, Tags,
  type LucideIcon,
} from "lucide-react";

import { useGetCompany, useGetDashboard } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { getSubSectorConfig, CROSS_MODULES } from "@/lib/sectors";
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
  Car, KeyRound, MapPin, CreditCard, ShieldCheck, FileSpreadsheet, Tv, Tags,
};


export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation({ select: (s) => s.pathname });
  const { data: company } = useGetCompany();
  const { data: dashboard } = useGetDashboard();
  const sub = getSubSectorConfig(company?.subSectorId);

  const alertsCount = dashboard?.lowStock?.length || 0;

  const renderItem = (item: typeof sub.metierModules[number]) => {
    const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard;
    const active = location === item.href;
    const showBadge = item.badge === "alerts" && alertsCount > 0;
    return (
      <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)} className="block">
        <div className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative cursor-pointer",
          active ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
        )}>
          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />}
          <Icon size={18} className="shrink-0" />
          <span className="text-sm truncate flex-1">{item.label}</span>
          {showBadge && (
            <span className="ml-auto bg-destructive/15 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
              {alertsCount}
            </span>
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

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out shrink-0",
        !isOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <Link to="/app" className="flex items-center gap-2">
            <img src={logoIcon} alt="GestioPro" className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-base text-sidebar-foreground">GestioPro</span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium">ERP Suite</span>
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
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Activité</p>
            <p className="text-sm font-semibold text-sidebar-foreground mt-0.5 truncate">{sub.label}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5 custom-scrollbar">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-2 mb-1">Métier</p>
          {sub.metierModules.map(renderItem)}

          <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-4 mb-1">Transversal</p>
          {CROSS_MODULES.map(renderItem)}

          <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mt-4 mb-1">Entreprise</p>
          <Link to="/app/parametres" onClick={() => setIsOpen(false)} className="block">
            <div className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer",
              location === "/app/parametres" ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
            )}>
              <Settings size={18} />
              <span className="text-sm truncate">Paramètres</span>
            </div>
          </Link>
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 rounded-lg p-2 bg-sidebar-accent/50">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-sm">
              {company?.ownerName?.charAt(0) || "G"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-sidebar-foreground truncate">
                {company?.ownerName || "Utilisateur"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate">{company?.name}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
