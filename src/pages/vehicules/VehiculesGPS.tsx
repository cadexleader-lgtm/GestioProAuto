import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollection, isRentalOverdue } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { MapPin, Gauge, Navigation, Satellite, KeyRound, Wrench, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Vehicle } from "@/lib/demo-data";

/** Bounding box approx. Dakar */
const BOX = { latMin: 14.68, latMax: 14.75, lngMin: -17.50, lngMax: -17.41 };

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Position simulée, déterministe par véhicule, animée pour les véhicules en circulation. */
function simulate(v: Vehicle, tick: number, moving: boolean) {
  const h = hash(v.id);
  const baseLat = BOX.latMin + ((h % 1000) / 1000) * (BOX.latMax - BOX.latMin);
  const baseLng = BOX.lngMin + (((h >> 10) % 1000) / 1000) * (BOX.lngMax - BOX.lngMin);
  const amp = moving ? 0.012 : 0;
  const phase = (h % 628) / 100;
  const lat = baseLat + Math.sin(tick / 6 + phase) * amp;
  const lng = baseLng + Math.cos(tick / 8 + phase) * amp;
  const trip = Array.from({ length: 8 }, (_, i) => {
    const t = tick - (7 - i) * 0.8;
    return {
      lat: baseLat + Math.sin(t / 6 + phase) * amp,
      lng: baseLng + Math.cos(t / 8 + phase) * amp,
    };
  });
  const speed = moving ? 25 + ((h >> 3) % 45) + Math.round(Math.sin(tick / 3 + phase) * 10) : 0;
  return { lat, lng, trip, speed: Math.max(0, speed) };
}

const STATE: Record<Vehicle["status"], { label: string; cls: string; dot: string; icon: React.ReactNode }> = {
  available:   { label: "Au parc",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: <CheckCircle2 size={13} /> },
  rented:      { label: "En location", cls: "bg-indigo-50 text-indigo-700 border-indigo-200",   dot: "bg-indigo-500",  icon: <KeyRound size={13} /> },
  maintenance: { label: "Atelier",     cls: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500",   icon: <Wrench size={13} /> },
  sold:        { label: "Vendu",       cls: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400",   icon: <CheckCircle2 size={13} /> },
};

export function VehiculesGPS() {
  const vehicles = useCollection("vehicles");
  const rentals = useCollection("rentals");
  const [tick, setTick] = useState(0);
  const search = useSearch({ strict: false }) as { v?: string };
  const [selected, setSelected] = useState<string | null>(search.v ?? null);

  useEffect(() => {
    if (search.v) setSelected(search.v);
  }, [search.v]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const tracked = useMemo(() => {
    return vehicles
      .filter((v) => v.status !== "sold")
      .map((v) => {
        const rental = rentals.find((r) => r.vehicleId === v.id && r.status === "active") ?? null;
        const moving = v.status === "rented";
        const sim = simulate(v, tick, moving);
        return { v, rental, ...sim, late: rental ? isRentalOverdue(rental) : false };
      });
  }, [vehicles, rentals, tick]);

  const toXY = (lat: number, lng: number) => ({
    x: ((lng - BOX.lngMin) / (BOX.lngMax - BOX.lngMin)) * 100,
    y: 100 - ((lat - BOX.latMin) / (BOX.latMax - BOX.latMin)) * 100,
  });

  const onRoad = tracked.filter((t) => t.v.status === "rented").length;
  const parked = tracked.filter((t) => t.v.status === "available").length;
  const garage = tracked.filter((t) => t.v.status === "maintenance").length;
  const alerts = tracked.filter((t) => t.late).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Suivi GPS de la flotte</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Positions synchronisées avec le parc, les locations et la maintenance (signal simulé pour la démo).
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          <Satellite size={13} className="text-emerald-600" /> {tracked.length} véhicule(s) tracké(s)
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="En circulation" value={onRoad} icon={<Navigation className="text-indigo-600" size={18} />} />
        <Kpi label="Au parc" value={parked} icon={<CheckCircle2 className="text-emerald-600" size={18} />} />
        <Kpi label="Atelier" value={garage} icon={<Wrench className="text-amber-600" size={18} />} />
        <Kpi label="Alertes retard" value={alerts} icon={<AlertTriangle className="text-rose-600" size={18} />} tone={alerts > 0 ? "rose" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden border shadow-sm">
          <CardContent className="p-0">
            <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_30%_20%,#eff6ff,#ecfdf5_45%,#fffbeb)]">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                <defs>
                  <pattern id="gps-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth="0.4" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#gps-grid)" />
                <path d="M 0 38 Q 30 33 60 50 T 100 56" stroke="rgba(100,116,139,0.30)" strokeWidth="1.6" fill="none" />
                <path d="M 18 0 Q 24 50 34 100" stroke="rgba(100,116,139,0.30)" strokeWidth="1.6" fill="none" />
                <path d="M 76 0 L 70 100" stroke="rgba(100,116,139,0.30)" strokeWidth="1.6" fill="none" />
                <path d="M 0 76 Q 50 70 100 82" stroke="rgba(100,116,139,0.30)" strokeWidth="1.6" fill="none" />

                {tracked.filter((t) => t.v.status === "rented").map((t) => {
                  const pts = t.trip.map((p) => toXY(p.lat, p.lng));
                  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  const active = selected === t.v.id;
                  return (
                    <path key={t.v.id} d={d} fill="none" strokeDasharray="2 1.5"
                      stroke={active ? "hsl(221 83% 45%)" : "hsl(221 83% 53%)"}
                      strokeWidth={active ? 1.8 : 1.1} opacity={selected && !active ? 0.3 : 0.9} />
                  );
                })}
              </svg>

              {tracked.map((t) => {
                const pos = toXY(t.lat, t.lng);
                const active = selected === t.v.id;
                const color = t.late ? "bg-rose-600" : t.v.status === "rented" ? "bg-indigo-600"
                  : t.v.status === "maintenance" ? "bg-amber-500" : "bg-emerald-600";
                return (
                  <button
                    key={t.v.id}
                    onClick={() => setSelected(active ? null : t.v.id)}
                    className="absolute transition-all duration-1000 ease-linear"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", opacity: selected && !active ? 0.45 : 1 }}
                  >
                    <span className={`relative flex ${active ? "w-11 h-11" : "w-9 h-9"} items-center justify-center rounded-full ${color} text-white shadow-lg ring-4 ring-white transition-all`}>
                      <Navigation size={active ? 18 : 15} className="rotate-45" />
                      {t.speed > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />}
                    </span>
                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-md shadow px-2 py-0.5 text-[10px] font-bold whitespace-nowrap border">
                      {t.v.plate}
                    </span>
                  </button>
                );
              })}

              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-md px-3 py-2 text-xs">
                <p className="font-bold flex items-center gap-1.5"><MapPin size={12} className="text-primary" /> Dakar, Sénégal</p>
                <p className="text-muted-foreground mt-0.5">Rafraîchissement auto · 3 s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {tracked.length === 0 && (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
              <Satellite size={40} className="mx-auto opacity-30 mb-3" />
              <p className="text-sm">Aucun véhicule à suivre</p>
            </div>
          )}
          {tracked.map((t) => {
            const st = STATE[t.v.status];
            const active = selected === t.v.id;
            return (
              <Card
                key={t.v.id}
                onClick={() => setSelected(active ? null : t.v.id)}
                className={`rounded-2xl cursor-pointer transition-all ${active ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {t.v.image ? <img src={t.v.image} alt="" className="w-full h-full object-cover" /> : t.v.photo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-sm truncate">{t.v.brand} {t.v.model}</h3>
                      <p className="text-[11px] text-muted-foreground">{t.v.plate}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border shrink-0 ${st.cls}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Gauge size={12} /> {t.speed > 0 ? `${t.speed} km/h` : "À l'arrêt"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={12} /> {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                    </span>
                  </div>

                  {t.rental && (
                    <div className={`mt-3 rounded-xl p-2.5 text-[11px] ${t.late ? "bg-rose-50 text-rose-800" : "bg-indigo-50 text-indigo-800"}`}>
                      <p className="font-semibold truncate">{t.rental.customer}</p>
                      <p>
                        Retour {new Date(t.rental.endDate).toLocaleDateString("fr-FR")} ·{" "}
                        {formatFCFA(t.rental.dailyRate)}/j {t.late && "· EN RETARD"}
                      </p>
                    </div>
                  )}

                  {t.v.status === "maintenance" && (
                    <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2.5">Immobilisé à l'atelier — signal statique.</p>
                  )}

                  {t.rental?.phone && (
                    <Button
                      size="sm" variant="outline" className="mt-3 w-full"
                      onClick={(e) => { e.stopPropagation(); window.open(`tel:${t.rental!.phone}`); }}
                    >
                      Appeler le conducteur
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: "rose" }) {
  const cls = tone === "rose" ? "bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200" : "bg-white/70 border-slate-200/60";
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </div>
  );
}
