import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Garanties } from "@/pages/electromenager/Garanties";

export const Route = createFileRoute("/app/elec/garanties")({
  head: () => ({ meta: [{ title: "Garanties & SAV — GestioPro" }] }),
  component: () => (<AppShell><Garanties /></AppShell>),
});
