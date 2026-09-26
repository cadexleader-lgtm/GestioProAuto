import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { NotificationCenter } from "@/lib/notifications";
import { AnimatedBackground } from "@/components/AnimatedBackground";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] text-foreground font-sans overflow-hidden relative flex bg-gradient-to-br from-background via-background to-primary/[0.03] dark:to-primary/[0.05]">
      {/* Fond "voile" (même famille que les pages de connexion), discret : légèrement
          flouté mais les formes/mouvement restent visibles — visible sur toutes les
          pages de l'app puisque injecté ici une seule fois, jamais page par page.
          Les cartes de contenu restent en `bg-card` opaque (100%), donc la légibilité
          des composants n'est jamais affectée par ce fond. `blur-md` (12px) rendait le
          motif méconnaissable comme animation ("juste un dégradé flou") ; `blur-sm`
          (4px) restait encore trop discret — `blur-[2px]` est le point d'équilibre
          retenu après retour utilisateur : les vagues se distinguent nettement tout
          en gardant un rendu doux, pas une illustration nette au premier plan. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <AnimatedBackground variant="silk" className="scale-110 blur-[2px] opacity-35 dark:opacity-40" />
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/[0.07] dark:bg-primary/[0.10] blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/[0.05] dark:bg-primary/[0.06] blur-[100px]" />
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 z-10 h-[100dvh]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-32 md:pb-24">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      <NotificationCenter />
    </div>
  );
}
