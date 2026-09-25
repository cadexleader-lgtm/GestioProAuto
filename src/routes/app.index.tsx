import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GestioAuto" },
      { name: "description", content: "Pilotez votre activité depuis le dashboard GestioAuto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});
