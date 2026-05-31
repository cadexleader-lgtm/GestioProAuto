import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Customers } from "@/pages/Customers";

export const Route = createFileRoute("/app/clients")({
  head: () => ({ meta: [{ title: "Clients — GestioPro" }] }),
  component: () => (<AppShell><Customers /></AppShell>),
});
