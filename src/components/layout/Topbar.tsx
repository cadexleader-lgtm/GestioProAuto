import { useState, useEffect } from "react";
import { Menu, Search, Bell, ChevronDown, Plus } from "lucide-react";
import { useGetCompany, useGetDashboard } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  onNewSale: () => void;
}

export function Topbar({ onMenuClick, onNewSale }: TopbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const { data: company } = useGetCompany();
  const { data: dashboard } = useGetDashboard();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const alertsCount = dashboard?.lowStock?.length || 0;

  return (
    <header className={cn(
      "h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 transition-all duration-200 z-20 sticky top-0",
      scrolled ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
    )}>
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors md:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="h-9 flex items-center px-3 bg-card rounded-lg border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all max-w-md w-full sm:w-64 group hidden sm:flex cursor-pointer hover:border-primary/50">
          <Search size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
          <span className="text-sm px-2 text-muted-foreground select-none">Rechercher... (Bientôt)</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-xs font-medium text-muted-foreground">En ligne</span>
        </div>
        
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Bell size={20} />
          {alertsCount > 0 && (
            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background"></span>
          )}
        </button>

        <button 
          onClick={onNewSale}
          className="md:hidden w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20"
        >
          <Plus size={18} />
        </button>
      </div>
    </header>
  );
}