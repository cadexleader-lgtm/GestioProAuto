import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RestaurantTables } from "@/pages/restaurant/RestaurantTables";

export const Route = createFileRoute("/app/resto/tables")({
  head: () => ({ meta: [{ title: "Tables — GestioPro" }] }),
  component: () => (<AppShell><RestaurantTables /></AppShell>),
});
