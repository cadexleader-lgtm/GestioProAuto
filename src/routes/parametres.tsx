import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "@/pages/Settings";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — GestioPro" }] }),
  component: () => (<AppShell><Settings /></AppShell>),
});
