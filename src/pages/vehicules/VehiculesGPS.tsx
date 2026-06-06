import { Card, CardContent } from "@/components/ui/card";
import { gpsTracks, vehicles } from "@/lib/demo-data";
import { MapPin, Gauge, Clock, Navigation } from "lucide-react";

export function VehiculesGPS() {
  // Bbox approx Dakar
  const latMin = 14.68, latMax = 14.73, lngMin = -17.48, lngMax = -17.43;
  const toXY = (lat: number, lng: number) => ({
    x: ((lng - lngMin) / (lngMax - lngMin)) * 100,
    y: 100 - ((lat - latMin) / (latMax - latMin)) * 100,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Suivi GPS</h1>
        <p className="text-muted-foreground mt-1">Position et trajets de votre flotte en temps réel (simulé pour la démo).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 via-emerald-50 to-amber-50">
              {/* fake roads */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(15,23,42,0.04)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                <path d="M 0 40 Q 30 35 60 50 T 100 55" stroke="rgba(100,116,139,0.35)" strokeWidth="1.2" fill="none" />
                <path d="M 20 0 Q 25 50 35 100" stroke="rgba(100,116,139,0.35)" strokeWidth="1.2" fill="none" />
                <path d="M 75 0 L 70 100" stroke="rgba(100,116,139,0.35)" strokeWidth="1.2" fill="none" />
                <path d="M 0 75 Q 50 70 100 80" stroke="rgba(100,116,139,0.35)" strokeWidth="1.2" fill="none" />

                {gpsTracks.map((t, idx) => {
                  const points = t.trip.map(p => toXY(p.lat, p.lng));
                  const d = points.map((p, i) => `${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
                  return (
                    <g key={t.vehicleId}>
                      <path d={d} stroke={idx === 0 ? "hsl(221 83% 53%)" : "hsl(280 65% 60%)"} strokeWidth="1.5" fill="none" strokeDasharray="2 1" />
                    </g>
                  );
                })}
              </svg>

              {gpsTracks.map((t, idx) => {
                const v = vehicles.find(x => x.id === t.vehicleId);
                const pos = toXY(t.lat, t.lng);
                const color = idx === 0 ? "bg-blue-600" : "bg-purple-600";
                return (
                  <div key={t.vehicleId} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
                    <div className={`relative ${color} text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg ring-4 ring-white`}>
                      <Navigation size={16} className="rotate-45" />
                      {t.speedKmh > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-md shadow-md px-2 py-1 text-[10px] font-bold whitespace-nowrap border">
                      {v?.plate}
                    </div>
                  </div>
                );
              })}

              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-2 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5"><MapPin size={12} className="text-primary" /> Dakar, Sénégal</p>
                <p className="text-muted-foreground mt-0.5">Carte interactive simulée</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {gpsTracks.map(t => {
            const v = vehicles.find(x => x.id === t.vehicleId)!;
            return (
              <Card key={t.vehicleId} className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{v.photo}</div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-sm">{v.brand} {v.model}</h3>
                      <p className="text-xs text-muted-foreground">{v.plate}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${t.speedKmh > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {t.speedKmh > 0 ? "EN ROUTE" : "ARRÊTÉ"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><Gauge size={10}/> Vitesse</div>
                      <div className="font-semibold mt-0.5">{t.speedKmh} km/h</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><MapPin size={10}/> Lat/Lng</div>
                      <div className="font-mono text-[11px] mt-0.5">{t.lat.toFixed(3)}, {t.lng.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><Clock size={10}/> Maj</div>
                      <div className="text-xs mt-0.5">{new Date(t.lastUpdate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
