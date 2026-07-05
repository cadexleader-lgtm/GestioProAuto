import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesClients } from "@/pages/vehicules/VehiculesClients";

export const Route = createFileRoute("/app/auto/clients")({
  head: () => ({ meta: [{ title: "Clients auto — GestioPro" }] }),
  component: () => (
    <AppShell>
      <VehiculesClients />
    </AppShell>
  ),
});
