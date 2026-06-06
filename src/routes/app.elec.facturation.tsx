import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FacturationPro } from "@/pages/electromenager/FacturationPro";

export const Route = createFileRoute("/app/elec/facturation")({
  head: () => ({ meta: [{ title: "Facturation Pro — GestioPro" }] }),
  component: () => (<AppShell><FacturationPro /></AppShell>),
});
