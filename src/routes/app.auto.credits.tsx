import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesCredits } from "@/pages/vehicules/VehiculesCredits";

export const Route = createFileRoute("/app/auto/credits")({
  head: () => ({ meta: [{ title: "Ventes à crédit — GestioPro" }] }),
  component: () => (<AppShell><VehiculesCredits /></AppShell>),
});
