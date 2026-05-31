import { Link, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, ShoppingCart, Package, Users, 
  FileText, Settings, X
} from "lucide-react";
import { useGetCompany, useGetDashboard } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/gestiopro-icon.png";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation({ select: (s) => s.pathname });
  const { data: company } = useGetCompany();
  const { data: dashboard } = useGetDashboard();

  const alertsCount = dashboard?.lowStock?.length || 0;

  const navItems = [
    { href: "/app", icon: LayoutDashboard, label: "Tableau de bord" },
    { href: "/app/ventes", icon: ShoppingCart, label: "Ventes" },
    { href: "/app/stock", icon: Package, label: "Stock", badge: alertsCount > 0 ? alertsCount : undefined, alert: alertsCount > 0 },
    { href: "/app/clients", icon: Users, label: "Clients" },
    { href: "/app/rapports", icon: FileText, label: "Rapports" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out shrink-0",
        !isOpen && "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <Link to="/app" className="flex items-center gap-2">
            <img src={logoIcon} alt="GestioPro" className="w-8 h-8 rounded-lg shrink-0" />
            <span className="font-display font-bold text-xl text-sidebar-foreground">
              GestioPro
            </span>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)} className="block">
                <div className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden cursor-pointer",
                  active ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
                )}>
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
                  <div className="shrink-0 relative">
                    <item.icon size={20} />
                    {item.alert && <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full border border-sidebar" />}
                  </div>
                  <span className="text-sm truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3">Entreprise</p>
          </div>
          <Link to="/app/parametres" onClick={() => setIsOpen(false)} className="block">
            <div className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer",
              location === "/app/parametres" ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
            )}>
              <Settings size={20} />
              <span className="text-sm truncate">Paramètres</span>
            </div>
          </Link>
        </div>

        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 rounded-xl p-2 bg-sidebar-accent/50 border border-sidebar-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0">
              {company?.ownerName?.charAt(0) || "G"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {company?.ownerName || "Chargement..."}
              </span>
              <span className="text-xs text-sidebar-foreground/60 truncate">
                {company?.name}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
