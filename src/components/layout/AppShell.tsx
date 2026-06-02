import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NewSaleSheet } from "../sales/NewSaleSheet";
import { useGetCompany } from "@workspace/api-client-react";
import { getSectorConfig } from "@/lib/sectors";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNewSaleOpen, setNewSaleOpen] = useState(false);
  const { data: company } = useGetCompany();
  const sector = getSectorConfig(company?.sectorId);

  return (
    <div className="min-h-[100dvh] text-foreground font-sans overflow-hidden relative flex">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-sky-300/8 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-yellow-300/6 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] rounded-full bg-blue-400/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=')] opacity-[0.12]"></div>
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 z-10 h-[100dvh]">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onNewSale={() => setNewSaleOpen(true)}
          showQuickSale={sector.hasQuickSale}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-24">
            {children}
          </div>
        </main>
      </div>

      {sector.hasQuickSale && (
        <NewSaleSheet
          open={isNewSaleOpen}
          onOpenChange={setNewSaleOpen}
        />
      )}
    </div>
  );
}

