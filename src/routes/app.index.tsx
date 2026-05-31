import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GestioPro" },
      { name: "description", content: "Pilotez votre activité depuis le dashboard GestioPro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});
