import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "@/pages/Settings";

// `section` permet un lien direct vers un onglet précis (ex. la carte
// d'abonnement gratuit dans la Sidebar renvoie vers ?section=abonnement).
const searchSchema = z.object({
  section: z.enum(["entreprise", "marque", "equipe", "modules", "abonnement", "preferences", "danger"]).optional(),
});

export const Route = createFileRoute("/app/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — GestioAuto" }] }),
  validateSearch: searchSchema,
  component: () => (<AppShell><Settings /></AppShell>),
});
