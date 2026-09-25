type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );

  // `window.__lovableEvents` n'existe que dans l'éditeur/preview Lovable — en
  // production (Cloudflare), l'appel ci-dessus est un no-op silencieux et
  // aucune erreur réelle n'est jamais remontée nulle part. Écriture directe
  // dans `client_error_logs` (table Supabase, write-only côté client) en
  // filet de secours, pour diagnostiquer les bugs intermittents mobiles sans
  // dépendre d'une capture d'écran manuelle. Fire-and-forget, jamais awaité,
  // jamais laissé remonter — un souci réseau sur CE call ne doit surtout pas
  // provoquer une nouvelle erreur pendant qu'on est déjà en train d'en gérer
  // une (risque de boucle dans l'error boundary).
  try {
    const message = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : undefined;
    const stack = error instanceof Error ? error.stack : undefined;
    import("@/integrations/supabase/client")
      .then(({ supabase }) =>
        // Table volontairement absente des types generes (schema pas encore
        // repousse via `supabase db push` au moment d'ecrire ce fix) — meme
        // convention que `demo-store.ts:sb` pour les tables dynamiques.
        (supabase as any).from("client_error_logs").insert({
          message,
          error_name: errorName,
          stack,
          route: window.location.pathname,
          url: window.location.href,
          user_agent: navigator.userAgent,
          context,
        }),
      )
      .catch(() => { /* diagnostic best-effort — jamais bloquant */ });
  } catch {
    // idem : ne jamais laisser le reporting lui-même casser la reprise.
  }
}
