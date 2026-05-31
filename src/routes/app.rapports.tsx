import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Reports } from "@/pages/Reports";

export const Route = createFileRoute("/app/rapports")({
  head: () => ({ meta: [{ title: "Rapports — GestioPro" }] }),
  component: () => (<AppShell><Reports /></AppShell>),
});
