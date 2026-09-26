import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePendingFallback } from "./components/RoutePendingFallback";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Revenir sur l'app depuis l'appareil photo/le sélecteur de fichiers
      // natif redonne le focus à la fenêtre — le comportement par défaut
      // (true) relance un refetch à ce moment précis, perçu comme un
      // "rechargement" en plein flux d'ajout de document (cf. retours
      // utilisateur sur la lenteur/instabilité au retour d'appareil photo).
      queries: { refetchOnWindowFocus: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Chaque route est son propre chunk JS (code-splitting automatique de
    // TanStack Start) — sans repli visuel, changer de page sur une
    // connexion lente ressemble à une app figée le temps du téléchargement.
    defaultPendingComponent: RoutePendingFallback,
  });

  return router;
};
