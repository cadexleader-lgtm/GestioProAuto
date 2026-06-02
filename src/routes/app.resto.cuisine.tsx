import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RestaurantKitchen } from "@/pages/restaurant/RestaurantKitchen";

export const Route = createFileRoute("/app/resto/cuisine")({
  head: () => ({ meta: [{ title: "Cuisine — GestioPro" }] }),
  component: () => (<AppShell><RestaurantKitchen /></AppShell>),
});
