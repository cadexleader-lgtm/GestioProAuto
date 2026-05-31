import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Sales } from "@/pages/Sales";

export const Route = createFileRoute("/ventes")({
  head: () => ({ meta: [{ title: "Ventes — GestioPro" }] }),
  component: () => (
    <AppShell>
      <Sales />
    </AppShell>
  ),
});
