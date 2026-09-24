import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePendingFallback } from "./components/RoutePendingFallback";

export const getRouter = () => {
  const queryClient = new QueryClient();

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
