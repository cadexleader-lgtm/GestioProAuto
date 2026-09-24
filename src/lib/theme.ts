/**
 * Thème clair/sombre — toggle explicite persisté (localStorage), avec la
 * préférence système comme valeur par défaut au tout premier chargement.
 * Le script anti-flash dans src/routes/__root.tsx applique la classe .dark
 * sur <html> AVANT l'hydratation React pour éviter un flash clair→sombre.
 */
import { useEffect, useState } from "react";

const THEME_KEY = "gestiopro.theme";
export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function resolveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme: Theme) {
  try { window.localStorage.setItem(THEME_KEY, theme); } catch {}
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("gestiopro:theme", { detail: theme }));
}

/** Script inline injecté dans <head> (anti-flash) — voir __root.tsx. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent).detail);
    window.addEventListener("gestiopro:theme", onChange);
    return () => window.removeEventListener("gestiopro:theme", onChange);
  }, []);

  return [theme, setTheme];
}
