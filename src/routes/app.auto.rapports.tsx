import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesRapports } from "@/pages/vehicules/VehiculesRapports";

export const Route = createFileRoute("/app/auto/rapports")({
  head: () => ({ meta: [{ title: "Rapports auto — GestioPro" }] }),
  component: () => (
    <AppShell>
      <VehiculesRapports />
    </AppShell>
  ),
});
