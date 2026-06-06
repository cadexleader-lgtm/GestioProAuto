import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Depenses } from "@/pages/cross/Depenses";

export const Route = createFileRoute("/app/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — GestioPro" }] }),
  component: () => (<AppShell><Depenses /></AppShell>),
});
