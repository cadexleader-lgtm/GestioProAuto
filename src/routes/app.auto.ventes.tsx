import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesVentes } from "@/pages/vehicules/VehiculesVentes";

export const Route = createFileRoute("/app/auto/ventes")({
  head: () => ({ meta: [{ title: "Ventes véhicules — GestioAuto" }] }),
  component: () => (<AppShell><VehiculesVentes /></AppShell>),
});
