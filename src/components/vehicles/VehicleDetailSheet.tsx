import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { db, vehicleProfitability, isRentalOverdue } from "@/lib/demo-store";
import type { Vehicle } from "@/lib/demo-data";
import { Car, Fuel, Gauge, KeyRound, Wrench, ShoppingCart, Pencil, Send, TrendingUp, TrendingDown, ArrowLeft, Play } from "lucide-react";
import { VEHICLE_STATUS, RENTAL_STATUS, MAINTENANCE_STATUS, creditStatusLabel } from "@/lib/vehicle-status";
import { useRole, can } from "@/lib/roles";

interface VehicleDetailSheetProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRent?: (v: Vehicle) => void;
  onSell?: (v: Vehicle) => void;
  onMaintenance?: (v: Vehicle) => void;
  onEdit?: (v: Vehicle) => void;
  onShare?: (v: Vehicle) => void;
}

export function VehicleDetailSheet({ vehicle, open, onOpenChange, onRent, onSell, onMaintenance, onEdit, onShare }: VehicleDetailSheetProps) {
  const role = useRole();
  const canRent = can(role, "manage.rental");
  const canSell = can(role, "create.sale");
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (open) { setActivePhoto(null); setShowVideo(false); }
  }, [open, vehicle?.id]);

  if (!vehicle) return null;
  const rentals = db.list("rentals").filter((r) => r.vehicleId === vehicle.id);
  const sales = db.list("vehicleSales").filter((s) => s.vehicleId === vehicle.id);
  const maint = db.list("vehicleMaintenances").filter((m) => m.vehicleId === vehicle.id);
  const credits = db.list("vehicleCredits").filter((c) => c.vehicleId === vehicle.id);
  const payments = db.list("vehiclePayments");
  const prof = vehicleProfitability(vehicle.id);
  const st = VEHICLE_STATUS[vehicle.status];
  const gallery = [vehicle.image, ...(vehicle.photos ?? [])].filter((u): u is string => !!u);
  const heroPhoto = activePhoto ?? vehicle.image;

  const canRentThis = vehicle.status === "available" && canRent && !!onRent;
  const canSellThis = vehicle.status === "available" && canSell && !!onSell;
  const canMaintainThis = vehicle.status !== "sold" && vehicle.status !== "maintenance" && !!onMaintenance;

  const act = (fn?: (v: Vehicle) => void) => () => { onOpenChange(false); fn?.(vehicle); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 rounded-l-2xl">
        <div className="relative h-44 sm:h-56 bg-muted flex items-center justify-center overflow-hidden">
          {showVideo && vehicle.video ? (
            <video src={vehicle.video} controls autoPlay className="w-full h-full object-contain bg-black" />
          ) : heroPhoto ? (
            <img src={heroPhoto} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl sm:text-8xl">{vehicle.photo}</span>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold shadow-md hover:bg-white transition"
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <span className={`absolute top-3 right-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${st.badgeCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} /> {st.label}
          </span>
        </div>

        {/* Galerie — photos + vidéo, jusqu'à 8 médias au total */}
        {(gallery.length > 1 || vehicle.video) && (
          <div className="px-4 sm:px-6 pt-3 flex gap-2 overflow-x-auto">
            {gallery.map((url) => (
              <button
                key={url}
                onClick={() => { setActivePhoto(url); setShowVideo(false); }}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${!showVideo && heroPhoto === url ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {vehicle.video && (
              <button
                onClick={() => setShowVideo(true)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 bg-slate-900 flex items-center justify-center text-white transition ${showVideo ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <Play size={18} />
              </button>
            )}
          </div>
        )}

        <SheetHeader className="px-4 sm:px-6 pt-5">
          <SheetTitle className="text-xl sm:text-2xl font-display">{vehicle.brand} {vehicle.model}</SheetTitle>
          <SheetDescription>{vehicle.year} · {vehicle.color} · {vehicle.plate}</SheetDescription>
        </SheetHeader>

        {/* Actions rapides — évite d'avoir à refermer la fiche pour agir */}
        {(canRentThis || canSellThis || canMaintainThis || onEdit || onShare) && (
          <div className="px-4 sm:px-6 pt-4 flex flex-wrap gap-2">
            {canRentThis && <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={act(onRent)}><KeyRound size={14} /> Louer</Button>}
            {canSellThis && <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={act(onSell)}><ShoppingCart size={14} /> Vendre</Button>}
            {canMaintainThis && <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={act(onMaintenance)}><Wrench size={14} /> Maintenance</Button>}
            {onEdit && <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={act(onEdit)}><Pencil size={14} /> Modifier</Button>}
            {onShare && <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={act(onShare)}><Send size={14} /> Partager</Button>}
          </div>
        )}

        <div className="px-4 sm:px-6 pt-4">
          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1 p-1">
              <TabsTrigger value="info" className="text-xs sm:text-sm py-2 px-1">Infos</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm py-2 px-1">Historique</TabsTrigger>
              <TabsTrigger value="maint" className="text-xs sm:text-sm py-2 px-1">Maintenance</TabsTrigger>
              <TabsTrigger value="prof" className="text-xs sm:text-sm py-2 px-1">Rentabilité</TabsTrigger>
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
                <Info label="Prix affiché" value={formatFCFA(vehicle.sellingPrice)} />
                {!!vehicle.wholesalePrice && <Info label="Prix marchand" value={formatFCFA(vehicle.wholesalePrice)} />}
                {!!vehicle.minPrice && <Info label="Prix plancher" value={formatFCFA(vehicle.minPrice)} />}
              </div>
              {vehicle.notes && <div className="p-3 rounded-lg bg-muted text-sm">{vehicle.notes}</div>}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <Section title={`Locations (${rentals.length})`}>
                {rentals.length === 0 ? <Empty>Aucune location</Empty> : rentals.map((r) => {
                  const displayStatus = r.status === "active" && isRentalOverdue(r) ? "overdue" as const : r.status;
                  const rst = RENTAL_STATUS[displayStatus];
                  return (
                    <Row key={r.id} icon={<KeyRound size={14} />} title={r.customer} subtitle={`Du ${r.startDate} au ${r.endDate}`}
                      right={<Badge variant="outline" className={rst.cls}>{rst.label}</Badge>} />
                  );
                })}
              </Section>
              <Section title={`Ventes (${sales.length})`}>
                {sales.length === 0 ? <Empty>Aucune vente</Empty> : sales.map((s) => (
                  <Row key={s.id} icon={<TrendingUp size={14} />} title={s.customer} subtitle={`${s.date} · ${s.payment === "credit" ? "Crédit" : "Cash"}`} right={<span className="font-bold text-primary">{formatFCFA(s.amount)}</span>} />
                ))}
              </Section>
              {credits.length > 0 && (
                <Section title={`Crédits (${credits.length})`}>
                  {credits.map((c) => {
                    const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((s, p) => s + p.amount, 0);
                    const cst = creditStatusLabel(c, paid);
                    return (
                      <Row key={c.id} icon={<TrendingDown size={14} />} title={c.customer} subtitle={`${c.paidMonths}/${c.totalMonths} mensualités`}
                        right={<Badge variant="outline" className={cst.cls}>{cst.label}</Badge>} />
                    );
                  })}
                </Section>
              )}
            </TabsContent>

            <TabsContent value="maint" className="space-y-3 mt-4">
              {maint.length === 0 ? <Empty>Aucune maintenance enregistrée</Empty> : maint.map((m) => {
                const mst = MAINTENANCE_STATUS[m.status];
                return (
                  <div key={m.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <strong>{m.motif}</strong>
                      <Badge variant="outline" className={mst.cls}>{mst.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.type} · {m.garage || "—"} · {m.dateIn}</p>
                    <p className="text-sm mt-2"><Wrench size={12} className="inline mr-1" /> Coût: <strong>{formatFCFA((m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0))}</strong></p>
                  </div>
                );
              })}
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
