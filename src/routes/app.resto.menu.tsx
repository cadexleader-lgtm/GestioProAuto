import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RestaurantMenu } from "@/pages/restaurant/RestaurantMenu";

export const Route = createFileRoute("/app/resto/menu")({
  head: () => ({ meta: [{ title: "Menu — GestioPro" }] }),
  component: () => (<AppShell><RestaurantMenu /></AppShell>),
});
