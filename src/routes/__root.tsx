import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Préchargement des 2 poids de police réellement critiques pour le premier
// rendu (texte courant + titres) — pas les 8 poids importés dans styles.css,
// pour ne pas gaspiller de bande passante sur des poids non utilisés
// au-dessus de la ligne de flottaison.
import manropeRegularWoff2 from "@fontsource/manrope/files/manrope-latin-400-normal.woff2?url";
import soraBoldWoff2 from "@fontsource/sora/files/sora-latin-700-normal.woff2?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { THEME_INIT_SCRIPT } from "../lib/theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * TanStack Start/Router découpe automatiquement chaque route en son propre
 * chunk JS hashé (`app.auto.ventes-XXXX.js`, etc., servis avec
 * `cache-control: immutable` — voir `.output/public/_headers`). Le worker
 * Cloudflare (preset `cloudflare-module`) ne garde que les fichiers du DERNIER
 * déploiement : un onglet resté ouvert pendant qu'un nouveau déploiement a eu
 * lieu référence encore les anciens hash, qui n'existent plus côté serveur —
 * tout `import()` vers un de ces chunks (navigation vers une route pas encore
 * visitée dans l'onglet, ou un `await import("./pdf/templates")` déclenché au
 * clic) échoue alors avec "Failed to fetch dynamically imported module" (ou
 * équivalent). Un vrai réseau mobile capricieux (cible Bénin/Afrique) peut
 * produire la même erreur sans déploiement entre-temps. Dans les deux cas,
 * un `router.invalidate()` rejoue le même import() vers le même fichier
 * absent/injoignable — ça re-échoue à l'identique. Seul un vrai
 * `window.location.reload()` récupère un `index.html` et des références de
 * chunks à jour.
 */
const CHUNK_LOAD_ERROR_RE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk [\w.-]+ failed|unable to preload css/i;

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return CHUNK_LOAD_ERROR_RE.test(message);
}

/** Anti-boucle : au plus un rechargement forcé toutes les 10 s (sessionStorage
 * survit à un reload, contrairement à une simple variable en mémoire). */
const CHUNK_RELOAD_KEY = "gestiopro.chunk-reload-at";
function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage indisponible (navigation privée…) — on retente quand
    // même le reload une fois, tant pis pour la garde anti-boucle.
  }
  window.location.reload();
  return true;
}

// Filet de sécurité au niveau le plus bas : Vite dispatch cet évènement dès
// qu'un de ses `import()` compilés échoue, que l'erreur remonte ensuite ou
// non jusqu'à un composant React — donc même pour un import() déclenché hors
// rendu (ex. dans un handler de clic, cf. vehicle-pdf.ts/Documents.tsx/
// HrDialogs.tsx) qu'un error boundary React ne peut de toute façon pas
// attraper. `__root.tsx` n'est lui-même jamais splitté (route racine), donc
// ce listener est actif dès le tout premier rendu, avant toute navigation.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    reportLovableError(event.payload ?? event, { boundary: "vite_preload_error" });
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    if (isChunkLoadError(error)) {
      // Chunk de route obsolète ou coupure réseau pendant le téléchargement
      // (voir commentaire détaillé plus haut) : router.invalidate() rejouerait
      // le même import() voué au même échec. Un vrai rechargement complet est
      // le seul geste qui répare — anti-boucle intégré à reloadOnceForChunkError.
      reloadOnceForChunkError();
      return;
    }

    // Reprise automatique silencieuse, avec délai croissant : réseau mobile
    // capricieux (cible Bénin/Afrique) — une requête qui échoue une fois peut
    // très bien réussir 1 à 2 secondes plus tard sans qu'il s'agisse d'un vrai
    // chunk obsolète. 2 essais max (400 ms puis 1500 ms). Ne masque pas
    // l'erreur : elle est déjà journalisée ci-dessus (console.error +
    // reportLovableError) avant toute tentative de reprise.
    if (attempts.current >= 2) return;
    const delay = attempts.current === 0 ? 400 : 1500;
    attempts.current += 1;
    const t = setTimeout(() => {
      router.invalidate();
      reset();
    }, delay);
    return () => clearTimeout(t);
  }, [error, router, reset]);

  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu être chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Réessayez, la reprise est automatique dans la plupart des cas.
        </p>
        {/* Diagnostic temporaire : permet à un utilisateur de capturer le
            message exact (capture d'écran) en cas de récidive, plutôt que de
            deviner la cause à distance. Discret (replié), pas de stack trace
            brute affichée d'emblée. */}
        <details className="mt-3 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground/70 text-center">Détails techniques</summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[11px] text-muted-foreground">{detail}</pre>
        </details>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              // Un clic manuel après l'échec de la reprise auto (ex. anti-boucle
              // des 10 s pour une erreur de chunk) doit quand même pouvoir forcer
              // un vrai rechargement plutôt que rejouer indéfiniment le même
              // import() cassé.
              if (isChunkLoadError(error)) {
                window.location.reload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/app"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour au tableau de bord
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#2563eb" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "GestioPro" },
      { name: "application-name", content: "GestioPro" },
      { title: "GestioPro Auto — L'ERP des concessionnaires et loueurs de véhicules africains" },
      { name: "description", content: "GestioPro Auto : la plateforme tout-en-un pour gérer ventes, crédits, locations, maintenance, clients, fournisseurs, personnel et finances de votre parc automobile." },
      { property: "og:site_name", content: "GestioPro Auto" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "GestioPro Auto — L'ERP des concessionnaires et loueurs de véhicules africains" },
      { name: "twitter:title", content: "GestioPro Auto — L'ERP des concessionnaires et loueurs de véhicules africains" },
      { property: "og:description", content: "GestioPro Auto : la plateforme tout-en-un pour gérer ventes, crédits, locations, maintenance, clients, fournisseurs, personnel et finances de votre parc automobile." },
      { name: "twitter:description", content: "GestioPro Auto : la plateforme tout-en-un pour gérer ventes, crédits, locations, maintenance, clients, fournisseurs, personnel et finances de votre parc automobile." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d7194376-cf82-4375-ac46-eb12ccae0eb8" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d7194376-cf82-4375-ac46-eb12ccae0eb8" },
    ],
    links: [
      // Poids de police critiques pour le premier rendu (texte + titres) —
      // avant la feuille de style pour que le navigateur les découvre au
      // plus tôt (voir import ci-dessus, ne précharge que 2 des 8 poids
      // chargés par styles.css, ceux réellement utilisés au-dessus du pli).
      { rel: "preload", as: "font", type: "font/woff2", href: manropeRegularWoff2, crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: soraBoldWoff2, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash : applique .dark avant l'hydratation React, sinon flash clair→sombre au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
