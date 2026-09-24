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
  const retried = useRef(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Auto-recovery: a single silent retry fixes most transient chunk/network failures.
    if (!retried.current) {
      retried.current = true;
      const t = setTimeout(() => {
        router.invalidate();
        reset();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [error, router, reset]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu être chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Réessayez, la reprise est automatique dans la plupart des cas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
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
