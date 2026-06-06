import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Car, Fuel, Gauge, Calendar } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { vehicles, vehicleCost, vehicleMargin } from "@/lib/demo-data";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  available:   { label: "Disponible",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sold:        { label: "Vendu",        cls: "bg-slate-100 text-slate-600 border-slate-200" },
  rented:      { label: "En location",  cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  maintenance: { label: "En atelier",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function VehiculesList() {
  const [q, setQ] = useState("");
  const filtered = vehicles.filter(v =>
    `${v.brand} ${v.model} ${v.plate} ${v.vin}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Parc véhicules</h1>
          <p className="text-muted-foreground mt-1">{vehicles.length} véhicules · pilotez l'état, le financier et la documentation.</p>
        </div>
        <Button><Plus size={16} /> Ajouter un véhicule</Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marque, modèle, plaque, VIN..." className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(v => {
          const st = STATUS_LABEL[v.status];
          return (
            <Card key={v.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-7xl">
                {v.photo}
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                    <p className="text-xs text-muted-foreground">{v.color} · {v.year}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${st.cls}`}>{st.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Car size={12} /> {v.plate}</span>
                  <span className="inline-flex items-center gap-1.5"><Gauge size={12} /> {v.mileageKm.toLocaleString("fr-FR")} km</span>
                  <span className="inline-flex items-center gap-1.5"><Fuel size={12} /> {v.fuel}</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {v.transmission}</span>
                </div>
                <div className="pt-3 border-t flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prix de vente</p>
                    <p className="font-display font-bold text-primary">{formatFCFA(v.sellingPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Coût total</p>
                    <p className="text-sm font-semibold">{formatFCFA(vehicleCost(v))}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">+{formatFCFA(vehicleMargin(v))} marge</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
