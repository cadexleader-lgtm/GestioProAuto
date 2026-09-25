import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, PenLine, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  className?: string;
  height?: number;
}

/**
 * Zone de signature manuscrite — souris, stylet et tactile.
 * Retourne un PNG transparent en dataURL, intégrable dans les PDF.
 */
export function SignaturePad({ label = "Signature", value, onChange, className, height = 150 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const points = useRef<{ x: number; y: number }[]>([]);
  const [hasInk, setHasInk] = useState(!!value);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, rect.width * dpr);
    c.height = Math.max(1, rect.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
  }, [value]);

  // Redessine à chaque changement de `value` (ex: signature de l'entreprise
  // chargée de façon asynchrone après le montage — cas réel dans
  // CompanyBrandingCard où `useCompanyProfile()` peuple `value` après coup).
  useEffect(() => {
    setup();
  }, [setup]);

  // L'observateur de redimensionnement doit toujours appeler la dernière
  // version de `setup` (donc la dernière `value`) : un effet à dépendances
  // vides capturerait pour toujours la fermeture du montage initial et
  // repeindrait avec une valeur obsolète après un redimensionnement.
  const setupRef = useRef(setup);
  useEffect(() => { setupRef.current = setup; }, [setup]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => setupRef.current());
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const posOf = (c: HTMLCanvasElement, r: DOMRect, ev: { clientX: number; clientY: number }) => ({
    x: ev.clientX - r.left,
    y: ev.clientY - r.top,
  });

  // Trait lisse plutôt que des segments droits entre points bruts : on trace
  // une courbe quadratique passant par le milieu de chaque paire de points
  // consécutifs (technique standard des pads de signature — cf. lib
  // signature_pad). Sans ça, le tracé est anguleux/polygonal et ne ressemble
  // pas à une vraie signature manuscrite, surtout au tactile où les points
  // captés sont plus espacés qu'à la souris.
  const drawSmoothed = (ctx: CanvasRenderingContext2D) => {
    const pts = points.current;
    const n = pts.length;
    if (n < 3) return;
    const [p0, p1, p2] = pts.slice(n - 3);
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    drawing.current = true;
    c.setPointerCapture(e.pointerId);
    const r = c.getBoundingClientRect();
    const p = posOf(c, r, e);
    points.current = [p];
    // Point isolé (tap) visible même sans mouvement ensuite.
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = c.getBoundingClientRect();
    // getCoalescedEvents() restitue les positions intermédiaires capturées
    // par le système entre deux frames (mouvements rapides au doigt/stylet) —
    // sans ça, un tracé rapide perd des points et devient visiblement anguleux.
    const native = e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const events = coalesced.length ? coalesced : [native];
    for (const ev of events) {
      points.current.push(posOf(c, r, ev));
      drawSmoothed(ctx);
    }
    dirty.current = true;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    points.current = [];
    if (dirty.current) onChange(canvasRef.current?.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    setHasInk(false);
    onChange(undefined);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
          <PenLine size={13} /> {label}
        </span>
        {hasInk && (
          <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
            <Check size={12} /> Signé
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed bg-muted/20 transition-colors",
          hasInk ? "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-border",
        )}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none rounded-xl"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Signez ici (doigt, stylet ou souris)
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={clear} className="h-7 text-xs">
          <Eraser size={13} /> Effacer
        </Button>
      </div>
    </div>
  );
}
