import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ElecCredits } from "@/pages/electromenager/ElecCredits";

export const Route = createFileRoute("/app/elec/credits")({
  head: () => ({ meta: [{ title: "Ventes à crédit — GestioPro" }] }),
  component: () => (<AppShell><ElecCredits /></AppShell>),
});
