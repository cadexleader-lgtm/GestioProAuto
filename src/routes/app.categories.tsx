import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Categories } from "@/pages/Categories";

export const Route = createFileRoute("/app/categories")({
  head: () => ({ meta: [{ title: "Catégories — GestioPro" }] }),
  component: () => (<AppShell><Categories /></AppShell>),
});
