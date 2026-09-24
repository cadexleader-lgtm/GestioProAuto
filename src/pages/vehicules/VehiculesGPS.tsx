import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollection, isRentalOverdue } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { MapPin, Gauge, Navigation, Satellite, Wrench, CheckCircle2, AlertTriangle, HelpCircle, Radio } from "lucide-react";
import type { Vehicle } from "@/lib/demo-data";
import { VEHICLE_STATUS } from "@/lib/vehicle-status";
import { useRole, can } from "@/lib/roles";
import { VehicleTrackerDialog } from "@/components/vehicles/VehicleTrackerDialog";

/** Centre par défaut — Cotonou, Bénin (marché cible de l'app), utilisé tant
 * qu'aucun véhicule n'a de position connue. Remplace l'ancien centre fixe
 * sur Dakar hérité d'un signal entièrement simulé. */
const DEFAULT_CENTER: [number, number] = [6.3703, 2.3912];

function statusColor(status: Vehicle["status"], late: boolean) {
  if (late) return "#e11d48"; // rose-600
  if (status === "rented") return "#4f46e5"; // indigo-600
  if (status === "maintenance") return "#f59e0b"; // amber-500
  return "#059669"; // emerald-600
}

function markerIcon(color: string, active: boolean, moving: boolean) {
  const size = active ? 40 : 32;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color}" class="relative flex items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.45}" height="${size * 0.45}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      ${moving ? `<span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#34d399;border-radius:9999px;border:2px solid white"></span>` : ""}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Recentre/zoome la carte quand la sélection change, sans re-render forcé du reste. */
function FlyToSelection({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [position, map]);
  return null;
}

function ago(iso: string) {
  const ms = Date.now() - +new Date(iso);
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function VehiculesGPS() {
  const role = useRole();
  const canManage = can(role, "manage.rental");
  const vehicles = useCollection("vehicles");
  const rentals = useCollection("rentals");
  const search = useSearch({ strict: false }) as { v?: string };
  const [selected, setSelected] = useState<string | null>(search.v ?? null);
  const [trackerVehicle, setTrackerVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (search.v) setSelected(search.v);
  }, [search.v]);

  const fleet = useMemo(() => {
    return vehicles
      .filter((v) => v.status !== "sold")
      .map((v) => {
        const rental = rentals.find((r) => r.vehicleId === v.id && r.status === "active") ?? null;
        const late = rental ? isRentalOverdue(rental) : false;
        const moving = v.status === "rented" && !!v.lastPosition && (v.lastPosition.speedKmh ?? 0) > 3;
        return { v, rental, late, moving };
      });
  }, [vehicles, rentals]);

  const positioned = fleet.filter((f) => f.v.lastPosition);
  const unpositioned = fleet.filter((f) => !f.v.lastPosition);

  const onRoad = fleet.filter((f) => f.v.status === "rented").length;
  const parked = fleet.filter((f) => f.v.status === "available").length;
  const garage = fleet.filter((f) => f.v.status === "maintenance").length;
  const alerts = fleet.filter((f) => f.late).length;

  const selectedEntry = fleet.find((f) => f.v.id === selected);
  const flyTarget: [number, number] | null = selectedEntry?.v.lastPosition
    ? [selectedEntry.v.lastPosition.lat, selectedEntry.v.lastPosition.lng]
    : null;

  const initialCenter: [number, number] = positioned[0]?.v.lastPosition
    ? [positioned[0].v.lastPosition!.lat, positioned[0].v.lastPosition!.lng]
    : DEFAULT_CENTER;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Suivi GPS de la flotte</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Carte réelle · positions issues des trackers connectés ou saisies manuellement.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
          <Satellite size={13} className="text-emerald-600" /> {positioned.length}/{fleet.length} véhicule(s) localisé(s)
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="En circulation" value={onRoad} icon={<Navigation className="text-indigo-600" size={18} />} />
        <Kpi label={VEHICLE_STATUS.available.label} value={parked} icon={<CheckCircle2 className="text-emerald-600" size={18} />} />
        <Kpi label={VEHICLE_STATUS.maintenance.label} value={garage} icon={<Wrench className="text-amber-600" size={18} />} />
        <Kpi label="Alertes retard" value={alerts} icon={<AlertTriangle className="text-rose-600" size={18} />} tone={alerts > 0 ? "rose" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden border shadow-sm">
          <CardContent className="p-0">
            <div className="relative aspect-[4/3]">
              <MapContainer center={initialCenter} zoom={positioned.length ? 12 : 6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FlyToSelection position={flyTarget} />
                {positioned.map(({ v, late, moving }) => {
                  const active = selected === v.id;
                  return (
                    <Marker
                      key={v.id}
                      position={[v.lastPosition!.lat, v.lastPosition!.lng]}
                      icon={markerIcon(statusColor(v.status, late), active, moving)}
                      eventHandlers={{ click: () => setSelected(active ? null : v.id) }}
                    >
                      <Popup>
                        <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.plate}</p>
                        <p className="text-xs mt-1">Position {ago(v.lastPosition!.recordedAt)} ({v.lastPosition!.source === "webhook" ? "tracker" : "manuelle"})</p>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {positioned.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
                  <div className="text-center px-6">
                    <HelpCircle size={36} className="mx-auto opacity-40 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun véhicule localisé pour l'instant.<br />Associez un tracker ou saisissez une position manuelle.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {fleet.length === 0 && (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
              <Satellite size={40} className="mx-auto opacity-30 mb-3" />
              <p className="text-sm">Aucun véhicule à suivre</p>
            </div>
          )}
          {positioned.map(({ v, rental, late }) => {
            const st = VEHICLE_STATUS[v.status];
            const active = selected === v.id;
            return (
              <Card
                key={v.id}
                onClick={() => setSelected(active ? null : v.id)}
                className={`rounded-2xl cursor-pointer transition-all ${active ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover" /> : v.photo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-sm truncate">{v.brand} {v.model}</h3>
                      <p className="text-[11px] text-muted-foreground">{v.plate}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border shrink-0 ${st.badgeCls}`}>
                      <st.icon size={13} /> {st.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      {v.tracker ? <Radio size={12} className="text-emerald-600" /> : <Gauge size={12} />}
                      {v.lastPosition?.speedKmh != null ? `${Math.round(v.lastPosition.speedKmh)} km/h` : v.tracker ? "Tracker actif" : "Position manuelle"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={12} /> {ago(v.lastPosition!.recordedAt)}
                    </span>
                  </div>

                  {rental && (
                    <div className={`mt-3 rounded-xl p-2.5 text-[11px] ${late ? "bg-rose-50 text-rose-800" : "bg-indigo-50 text-indigo-800"}`}>
                      <p className="font-semibold truncate">{rental.customer}</p>
                      <p>
                        Retour {new Date(rental.endDate).toLocaleDateString("fr-FR")} ·{" "}
                        {formatFCFA(rental.dailyRate)}/j {late && "· EN RETARD"}
                      </p>
                    </div>
                  )}

                  {rental?.phone && (
                    <Button
                      size="sm" variant="outline" className="mt-3 w-full"
                      onClick={(e) => { e.stopPropagation(); window.open(`tel:${rental.phone}`); }}
                    >
                      Appeler le conducteur
                    </Button>
                  )}

                  {canManage && (
                    <Button
                      size="sm" variant="ghost" className="mt-2 w-full"
                      onClick={(e) => { e.stopPropagation(); setTrackerVehicle(v); }}
                    >
                      <Satellite size={13} /> Gérer le tracker / la position
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {unpositioned.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-2 px-1">
                Position inconnue ({unpositioned.length})
              </p>
              {unpositioned.map(({ v }) => {
                const st = VEHICLE_STATUS[v.status];
                return (
                  <Card key={v.id} className="rounded-2xl opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover" /> : v.photo}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display font-bold text-sm truncate">{v.brand} {v.model}</h3>
                          <p className="text-[11px] text-muted-foreground">{v.plate}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border shrink-0 ${st.badgeCls}`}>
                          <st.icon size={13} /> {st.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                        <HelpCircle size={12} /> {v.tracker ? "Tracker associé, en attente du premier signal" : "Aucun tracker ni position renseignée"}
                      </p>
                      {canManage && (
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setTrackerVehicle(v)}>
                          <Satellite size={13} /> {v.tracker ? "Voir le tracker" : "Ajouter un tracker"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>

      <VehicleTrackerDialog vehicle={trackerVehicle} open={!!trackerVehicle} onOpenChange={(v) => !v && setTrackerVehicle(null)} />
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
