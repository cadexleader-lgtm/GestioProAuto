import { unbindCompany } from "@/lib/demo-store";
import { resetTenant } from "@/lib/tenant";
import { useState, useEffect } from "react";
import { Menu, Search, Plus, User, Settings, LogOut, HelpCircle, Maximize2, Moon, FileText, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCompany } from "@workspace/api-client-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "./NotificationsBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  onMenuClick: () => void;
  onNewSale: () => void;
  showQuickSale?: boolean;
}

export function Topbar({ onMenuClick, onNewSale, showQuickSale = true }: TopbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const { data: company } = useGetCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const initial = company?.ownerName?.charAt(0)?.toUpperCase() || "G";

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    unbindCompany();
    resetTenant();
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate({ to: "/connexion", replace: true });
  };


  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header
      className={cn(
        "h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 transition-all duration-200 z-20 sticky top-0",
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors md:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="h-9 items-center px-3 bg-card rounded-lg border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all max-w-md w-full sm:w-64 group hidden sm:flex cursor-pointer hover:border-primary/50">
          <Search size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
          <span className="text-sm px-2 text-muted-foreground select-none">Rechercher... (Bientôt)</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-xs font-medium text-muted-foreground">En ligne</span>
        </div>

        {showQuickSale && (
          <button
            onClick={onNewSale}
            className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition"
          >
            <Plus size={16} /> Nouvelle vente
          </button>
        )}

        <Link
          to="/app/documents"
          className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
          title="Documents"
        >
          <FileText size={18} />
        </Link>

        <InstallAppButton className="hidden md:inline-flex h-9" />

        <NotificationsBell />

        {showQuickSale && (
          <button
            onClick={onNewSale}
            className="md:hidden w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20"
          >
            <Plus size={18} />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full border border-border bg-card hover:border-primary/50 transition">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
                {initial}
              </div>
              <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate">{company?.ownerName || "Utilisateur"}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{company?.name || "GestioPro"}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/app/parametres" })}>
              <User size={16} /> Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/app/parametres" })}>
              <Settings size={16} /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFullscreen}>
              <Maximize2 size={16} /> Plein écran
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Thème sombre bientôt disponible")}>
              <Moon size={16} /> Thème
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Centre d'aide bientôt disponible")}>
              <HelpCircle size={16} /> Aide & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut size={16} /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
