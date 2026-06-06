import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Fournisseurs } from "@/pages/cross/Fournisseurs";

export const Route = createFileRoute("/app/fournisseurs")({
  head: () => ({ meta: [{ title: "Fournisseurs — GestioPro" }] }),
  component: () => (<AppShell><Fournisseurs /></AppShell>),
});
