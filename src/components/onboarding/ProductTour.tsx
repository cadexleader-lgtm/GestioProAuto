import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/onboarding";

const CARD_WIDTH = 320;
const GAP = 12;
const PAD = 8;

/**
 * Tutoriel guidé léger, sur mesure (pas de librairie externe) : un calque
 * plein écran avec un "spotlight" (halo découpé via box-shadow) autour de
 * l'élément ciblé, et une carte d'explication qui se repositionne à côté.
 * Rendu en portail sur `document.body` pour rester au-dessus de tout
 * (sidebar, topbar, contenu) quel que soit le z-index local.
 */
export function ProductTour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(steps[index]?.target ?? "");
    // `offsetParent === null` détecte un élément caché (display:none, ex. la
    // recherche masquée sous `sm:`) — sans ça le spotlight viserait un
    // rectangle vide en (0,0). On bascule alors sur la carte centrée sans
    // repère visuel (cf. `!spot` plus bas), plutôt qu'un halo hors sujet.
    const visible = el instanceof HTMLElement && el.offsetParent !== null;
    setRect(visible ? el.getBoundingClientRect() : null);
  }, [index, steps]);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector(steps[index]?.target ?? "");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
    }, 60);
    return () => clearTimeout(t);
  }, [index, steps, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  if (!steps.length) return null;
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const next = () => (isLast ? onFinish() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const spot = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;

  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 400;
  const cardTop = spot
    ? (spot.top + spot.height + GAP + 180 < viewportH ? spot.top + spot.height + GAP : Math.max(12, spot.top - 180 - GAP))
    : viewportH / 2 - 90;
  const cardLeft = spot
    ? Math.min(Math.max(12, spot.left), viewportW - CARD_WIDTH - 12)
    : viewportW / 2 - CARD_WIDTH / 2;

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Tutoriel de découverte">
      <div
        className="absolute inset-0 bg-slate-900/65 transition-opacity"
        onClick={onFinish}
      />
      {spot && (
        <div
          className="absolute rounded-xl ring-2 ring-primary pointer-events-none transition-all duration-300 ease-out"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height, boxShadow: "0 0 0 9999px rgba(15,23,42,0.65)" }}
        />
      )}

      <div
        className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ top: cardTop, left: cardLeft }}
      >
        <button
          type="button"
          onClick={onFinish}
          aria-label="Fermer le tutoriel"
          className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
        >
          <X size={16} />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Étape {index + 1} / {steps.length}</p>
        <h3 className="mt-1 pr-5 font-display text-base font-bold text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={prev} aria-label="Étape précédente">
                <ArrowLeft size={14} />
              </Button>
            )}
            <Button type="button" size="sm" onClick={next}>
              {isLast ? "Terminer" : "Suivant"} {!isLast && <ArrowRight size={14} />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
