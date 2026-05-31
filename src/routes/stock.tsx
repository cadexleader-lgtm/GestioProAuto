import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Stock } from "@/pages/Stock";

export const Route = createFileRoute("/stock")({
  head: () => ({ meta: [{ title: "Stock — GestioPro" }] }),
  component: () => (<AppShell><Stock /></AppShell>),
});
