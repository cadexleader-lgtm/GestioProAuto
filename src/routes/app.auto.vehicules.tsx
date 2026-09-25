import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesList } from "@/pages/vehicules/VehiculesList";

export const Route = createFileRoute("/app/auto/vehicules")({
  head: () => ({ meta: [{ title: "Parc véhicules — GestioAuto" }] }),
  component: () => (<AppShell><VehiculesList /></AppShell>),
});
