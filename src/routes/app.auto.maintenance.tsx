import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesMaintenance } from "@/pages/vehicules/VehiculesMaintenance";

export const Route = createFileRoute("/app/auto/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance véhicules — GestioPro" }] }),
  component: () => (<AppShell><VehiculesMaintenance /></AppShell>),
});
