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

  useEffect(() => {
    setup();
    const ro = new ResizeObserver(() => setup());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
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
          hasInk ? "border-emerald-400/60 bg-emerald-50/40" : "border-border",
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
