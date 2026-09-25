import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/pages/Onboarding";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Bienvenue — GestioAuto" }] }),
  component: Onboarding,
});
