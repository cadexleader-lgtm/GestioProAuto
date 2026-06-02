import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RestaurantOrders } from "@/pages/restaurant/RestaurantOrders";

export const Route = createFileRoute("/app/resto/commandes")({
  head: () => ({ meta: [{ title: "Commandes — GestioPro" }] }),
  component: () => (<AppShell><RestaurantOrders /></AppShell>),
});
