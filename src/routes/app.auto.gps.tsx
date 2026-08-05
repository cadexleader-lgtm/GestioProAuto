import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VehiculesGPS } from "@/pages/vehicules/VehiculesGPS";

export const Route = createFileRoute("/app/auto/gps")({
  validateSearch: (search: Record<string, unknown>) => ({
    v: typeof search.v === "string" ? search.v : undefined,
  }),
  head: () => ({ meta: [{ title: "Suivi GPS — GestioPro" }] }),
  component: () => (<AppShell><VehiculesGPS /></AppShell>),
});
