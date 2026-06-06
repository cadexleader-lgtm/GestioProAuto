import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesLocations } from "@/pages/vehicules/VehiculesLocations";

export const Route = createFileRoute("/app/auto/locations")({
  head: () => ({ meta: [{ title: "Locations véhicules — GestioPro" }] }),
  component: () => (<AppShell><VehiculesLocations /></AppShell>),
});
