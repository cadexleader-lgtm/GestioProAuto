import { Skeleton } from "@/components/ui/skeleton";

/**
 * Repli affiché par le routeur (TanStack Router `defaultPendingComponent`)
 * pendant le téléchargement du chunk JS d'une route (code-splitting actif
 * par défaut avec TanStack Start — chaque route a son propre chunk). Sans
 * ça, un changement de page sur une connexion lente donne l'impression que
 * l'app est figée le temps du fetch. `defaultPendingMs`/`defaultPendingMinMs`
 * (valeurs par défaut du routeur) évitent le flash sur les transitions
 * rapides — ce composant ne s'affiche que si le chargement dépasse ~1s.
 */
export function RoutePendingFallback() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </div>
  );
}
