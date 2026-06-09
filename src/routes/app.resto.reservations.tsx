import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RestaurantReservations } from "@/pages/restaurant/RestaurantReservations";

export const Route = createFileRoute("/app/resto/reservations")({
  head: () => ({ meta: [{ title: "Réservations — GestioPro" }] }),
  component: () => (<AppShell><RestaurantReservations /></AppShell>),
});
