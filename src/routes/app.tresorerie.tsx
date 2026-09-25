import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Tresorerie } from "@/pages/cross/Tresorerie";

export const Route = createFileRoute("/app/tresorerie")({
  head: () => ({ meta: [{ title: "Trésorerie — GestioAuto" }] }),
  component: () => (<AppShell><Tresorerie /></AppShell>),
});
