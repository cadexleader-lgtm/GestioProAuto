import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NewSaleSheet } from "../sales/NewSaleSheet";
import { useGetCompany } from "@workspace/api-client-react";
import { getSubSectorConfig } from "@/lib/sectors";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNewSaleOpen, setNewSaleOpen] = useState(false);
  const { data: company } = useGetCompany();
  const sub = getSubSectorConfig(company?.subSectorId);

  return (
    <div className="min-h-[100dvh] text-foreground font-sans overflow-hidden relative flex">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/[0.05] blur-[100px]" />
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 z-10 h-[100dvh]">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onNewSale={() => setNewSaleOpen(true)}
          showQuickSale={sub.hasQuickSale}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-24">
            {children}
          </div>
        </main>
      </div>

      {sub.hasQuickSale && (
        <NewSaleSheet
          open={isNewSaleOpen}
          onOpenChange={setNewSaleOpen}
        />
      )}
    </div>
  );
}
