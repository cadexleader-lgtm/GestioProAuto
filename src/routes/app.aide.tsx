import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Aide } from "@/pages/cross/Aide";

export const Route = createFileRoute("/app/aide")({
  head: () => ({ meta: [{ title: "Aide & Support — GestioPro" }] }),
  component: () => (<AppShell><Aide /></AppShell>),
});
