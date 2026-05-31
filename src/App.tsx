import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { Onboarding } from "@/pages/Onboarding";
import { Sales } from "@/pages/Sales";
import { Stock } from "@/pages/Stock";
import { Customers } from "@/pages/Customers";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      
      <Route path="/">
        <AppShell><Dashboard /></AppShell>
      </Route>
      <Route path="/ventes">
        <AppShell><Sales /></AppShell>
      </Route>
      <Route path="/stock">
        <AppShell><Stock /></AppShell>
      </Route>
      <Route path="/clients">
        <AppShell><Customers /></AppShell>
      </Route>
      <Route path="/rapports">
        <AppShell><Reports /></AppShell>
      </Route>
      <Route path="/parametres">
        <AppShell><Settings /></AppShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
