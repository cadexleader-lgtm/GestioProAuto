import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Personnel } from "@/pages/cross/Personnel";

export const Route = createFileRoute("/app/personnel")({
  head: () => ({ meta: [{ title: "Personnel — GestioPro" }] }),
  component: () => (<AppShell><Personnel /></AppShell>),
});
