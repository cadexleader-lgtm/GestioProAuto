import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import { db, vehicleProfitability } from "@/lib/demo-store";
import type { Vehicle } from "@/lib/demo-data";
import { Car, Fuel, Gauge, KeyRound, Wrench, TrendingUp, TrendingDown } from "lucide-react";

const STATUS_LABEL: Record<Vehicle["status"], { label: string; cls: string }> = {
  available: { label: "Disponible", cls: "bg-emerald-100 text-emerald-700" },
  sold: { label: "Vendu", cls: "bg-slate-200 text-slate-700" },
  rented: { label: "Loué", cls: "bg-indigo-100 text-indigo-700" },
  maintenance: { label: "Maintenance", cls: "bg-amber-100 text-amber-700" },
};

export function VehicleDetailSheet({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!vehicle) return null;
  const rentals = db.list("rentals").filter((r) => r.vehicleId === vehicle.id);
  const sales = db.list("vehicleSales").filter((s) => s.vehicleId === vehicle.id);
  const maint = db.list("vehicleMaintenances").filter((m) => m.vehicleId === vehicle.id);
  const credits = db.list("vehicleCredits").filter((c) => c.vehicleId === vehicle.id);
  const prof = vehicleProfitability(vehicle.id);
  const st = STATUS_LABEL[vehicle.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="relative h-56 bg-gradient-to-br from-slate-100 to-slate-300 flex items-center justify-center overflow-hidden">
          {vehicle.image ? (
            <img src={vehicle.image} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">{vehicle.photo}</span>
          )}
          <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full ${st.cls} backdrop-blur`}>{st.label}</span>
        </div>
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-2xl font-display">{vehicle.brand} {vehicle.model}</SheetTitle>
          <SheetDescription>{vehicle.year} · {vehicle.color} · {vehicle.plate}</SheetDescription>
        </SheetHeader>

        <div className="px-6 pt-4">
          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="info">Infos</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
              <TabsTrigger value="maint">Maintenance</TabsTrigger>
              <TabsTrigger value="prof">Rentabilité</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Info icon={<Car size={14} />} label="Plaque" value={vehicle.plate} />
                <Info icon={<Gauge size={14} />} label="Kilométrage" value={`${vehicle.mileageKm.toLocaleString("fr-FR")} km`} />
                <Info icon={<Fuel size={14} />} label="Carburant" value={vehicle.fuel} />
                <Info icon={<KeyRound size={14} />} label="Transmission" value={vehicle.transmission} />
                <Info label="VIN" value={vehicle.vin || "—"} />
                <Info label="Année" value={String(vehicle.year)} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Info label="Prix d'achat" value={formatFCFA(vehicle.purchasePrice)} />
                <Info label="Prix de vente" value={formatFCFA(vehicle.sellingPrice)} />
              </div>
              {vehicle.notes && <div className="p-3 rounded-lg bg-muted text-sm">{vehicle.notes}</div>}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <Section title={`Locations (${rentals.length})`}>
                {rentals.length === 0 ? <Empty>Aucune location</Empty> : rentals.map((r) => (
                  <Row key={r.id} icon={<KeyRound size={14} />} title={r.customer} subtitle={`Du ${r.startDate} au ${r.endDate}`} right={<Badge variant="secondary">{r.status}</Badge>} />
                ))}
              </Section>
              <Section title={`Ventes (${sales.length})`}>
                {sales.length === 0 ? <Empty>Aucune vente</Empty> : sales.map((s) => (
                  <Row key={s.id} icon={<TrendingUp size={14} />} title={s.customer} subtitle={`${s.date} · ${s.payment === "credit" ? "Crédit" : "Cash"}`} right={<span className="font-bold text-primary">{formatFCFA(s.amount)}</span>} />
                ))}
              </Section>
              {credits.length > 0 && (
                <Section title={`Crédits (${credits.length})`}>
                  {credits.map((c) => (
                    <Row key={c.id} icon={<TrendingDown size={14} />} title={c.customer} subtitle={`${c.paidMonths}/${c.totalMonths} mensualités`} right={<Badge variant={c.status === "late" ? "destructive" : "secondary"}>{c.status === "late" ? "En retard" : "OK"}</Badge>} />
                  ))}
                </Section>
              )}
            </TabsContent>

            <TabsContent value="maint" className="space-y-3 mt-4">
              {maint.length === 0 ? <Empty>Aucune maintenance enregistrée</Empty> : maint.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <strong>{m.motif}</strong>
                    <Badge variant="outline">{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{m.type} · {m.garage || "—"} · {m.dateIn}</p>
                  <p className="text-sm mt-2"><Wrench size={12} className="inline mr-1" /> Coût: <strong>{formatFCFA((m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0))}</strong></p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="prof" className="space-y-3 mt-4">
              {prof && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Revenus location" value={formatFCFA(prof.rentalRevenue)} tone="emerald" />
                    <Stat label="Revenus vente" value={formatFCFA(prof.saleRevenue)} tone="emerald" />
                    <Stat label="Coût total" value={formatFCFA(prof.totalCost)} tone="slate" />
                    <Stat label="Coût maintenance" value={formatFCFA(prof.maintCost)} tone="amber" />
                  </div>
                  <div className={`p-5 rounded-xl border ${prof.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"} mt-2`}>
                    <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Profit net réalisé</p>
                    <p className={`font-display font-bold text-2xl mt-1 ${prof.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatFCFA(prof.profit)}</p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="h-6" />
      </SheetContent>
    </Sheet>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold inline-flex items-center gap-1">{icon}{label}</p>
      <p className="font-semibold mt-1 text-sm truncate">{value}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</p><div className="space-y-2">{children}</div></div>;
}
function Row({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{children}</p>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "slate" | "amber" }) {
  const cls = { emerald: "bg-emerald-50 text-emerald-800", slate: "bg-slate-100 text-slate-800", amber: "bg-amber-50 text-amber-800" }[tone];
  return (
    <div className={`p-4 rounded-xl ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">{label}</p>
      <p className="font-display font-bold text-lg mt-1">{value}</p>
    </div>
  );
}
