import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Documents } from "@/pages/cross/Documents";

export const Route = createFileRoute("/app/documents")({
  head: () => ({ meta: [{ title: "Documents — GestioPro" }] }),
  component: () => (<AppShell><Documents /></AppShell>),
});
