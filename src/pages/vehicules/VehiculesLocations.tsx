import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, startRental, returnRental, isRentalOverdue } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { KeyRound, Plus, AlertTriangle, Calendar, CheckCircle2, RotateCcw, FileText, MessageCircle, Archive, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { RentVehicleDialog, ReturnRentalDialog } from "@/components/vehicles/VehicleActionsDialogs";
import { generateRentalContract, sendWhatsApp } from "@/lib/vehicle-pdf";
import type { Rental } from "@/lib/demo-data";

const STATUS: Record<Rental["status"], { label: string; cls: string }> = {
  reserved:  { label: "Réservé",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  active:    { label: "En cours",  cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  returned:  { label: "Retourné",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  overdue:   { label: "En retard", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Annulé",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function VehiculesLocations() {
  const rentals = useCollection("rentals");
  const vehicles = useCollection("vehicles");
  const [openPicker, setOpenPicker] = useState(false);
  const [pickedId, setPickedId] = useState<string>("");
  const [returnId, setReturnId] = useState<string | null>(null);
  const [rentVehicleId, setRentVehicleId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-detect overdue and reflect in display (do not mutate)
  const enriched = useMemo(() => rentals.map((r) => ({
    ...r,
    displayStatus: r.status === "active" && isRentalOverdue(r) ? ("overdue" as const) : r.status,
  })), [rentals]);

  const active = enriched.filter((r) => r.displayStatus === "active" || r.displayStatus === "overdue" || r.displayStatus === "reserved");
  const history = enriched.filter((r) => r.displayStatus === "returned" || r.displayStatus === "cancelled");
  const today = enriched.filter((r) => r.displayStatus === "active" || r.displayStatus === "overdue");
  const overdueCount = enriched.filter((r) => r.displayStatus === "overdue").length;
  const revenueMonth = enriched
    .filter((r) => new Date(r.startDate).getMonth() === new Date().getMonth())
    .reduce((s, r) => {
      const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
      return s + days * r.dailyRate;
    }, 0);

  const availableVehicles = vehicles.filter((v) => v.status === "available");

  const openNewContract = () => {
    if (availableVehicles.length === 0) { toast.error("Aucun véhicule disponible"); return; }
    setPickedId(availableVehicles[0].id);
    setOpenPicker(true);
  };

  const confirmPick = () => {
    if (!pickedId) return toast.error("Sélectionnez un véhicule");
    setOpenPicker(false);
    setRentVehicleId(pickedId);
  };

  const handleReturn = (id: string) => setReturnId(id);
  const confirmReturn = (data: any) => {
    if (!returnId) return;
    returnRental(returnId, data);
    toast.success("Véhicule retourné — disponible à nouveau");
  };

  const rentVehicle = rentVehicleId ? vehicles.find((v) => v.id === rentVehicleId) ?? null : null;
  const returnRentalObj = returnId ? rentals.find((r) => r.id === returnId) : null;
  const returnVehicle = returnRentalObj ? vehicles.find((v) => v.id === returnRentalObj.vehicleId) ?? null : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground mt-1 text-sm">Contrats, retours, dépôts et alertes de retard.</p>
        </div>
        <Button onClick={openNewContract} className="shadow-lg shadow-primary/20"><Plus size={16} /> Nouveau contrat</Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="En cours" value={today.length} icon={<KeyRound className="text-indigo-600" size={18} />} />
        <Kpi label="En retard" value={overdueCount} icon={<AlertTriangle className="text-rose-600" size={18} />} tone={overdueCount > 0 ? "rose" : undefined} />
        <Kpi label="Dispo" value={vehicles.filter((v) => v.status === "available").length} icon={<CheckCircle2 className="text-emerald-600" size={18} />} />
        <Kpi label="Revenus du mois" valueText={formatFCFA(revenueMonth)} icon={<Calendar className="text-violet-600" size={18} />} />
      </div>

      {/* Contrats en cours */}
      <div className="grid gap-3">
        {active.length === 0 && (
          <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed">
            <KeyRound size={40} className="mx-auto opacity-30 mb-3" />
            <p className="text-sm">Aucune location en cours</p>
          </div>
        )}
        {active.map((r) => {
          const v = vehicles.find((x) => x.id === r.vehicleId);
          if (!v) return null;
          const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
          const total = days * r.dailyRate;
          const st = STATUS[r.displayStatus];
          const lateDays = r.displayStatus === "overdue" ? Math.round((Date.now() - +new Date(r.endDate)) / 86400000) : 0;
          return (
            <Card key={r.id} className={`shadow-sm overflow-hidden ${r.displayStatus === "overdue" ? "border-rose-300" : ""}`}>
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="text-4xl shrink-0">{v.image ? <img src={v.image} alt="" className="w-14 h-14 rounded-lg object-cover" /> : v.photo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${st.cls}`}>{st.label}</span>
                    {lateDays > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-100 text-rose-700">+{lateDays}j</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.customer} {r.phone ? `· ${r.phone}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.startDate).toLocaleDateString("fr-FR")} → {new Date(r.endDate).toLocaleDateString("fr-FR")} · <strong>{days}j</strong></p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm w-full md:w-auto">
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Tarif</p><p className="font-semibold">{formatFCFA(r.dailyRate)}/j</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Caution</p><p className="font-semibold">{formatFCFA(r.deposit)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p><p className="font-bold text-primary">{formatFCFA(total)}</p></div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { generateRentalContract(r, v); toast.success("Contrat PDF généré"); }}>
                    <FileText size={14} /> PDF
                  </Button>
                  {r.phone && (
                    <Button size="sm" variant="outline" onClick={() => sendWhatsApp(r.phone!, `Bonjour ${r.customer}, rappel : retour du ${v.brand} ${v.model} prévu le ${new Date(r.endDate).toLocaleDateString("fr-FR")}. — GestioPro`)}>
                      <MessageCircle size={14} /> WA
                    </Button>
                  )}
                  {(r.displayStatus === "active" || r.displayStatus === "overdue") && (
                    <Button size="sm" variant="outline" onClick={() => handleReturn(r.id)}><RotateCcw size={14} /> Retourner</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Historique des locations */}
      {history.length > 0 && (
        <div className="rounded-2xl border bg-white/60 backdrop-blur-xl overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition"
          >
            <span className="inline-flex items-center gap-2 font-display font-semibold text-sm">
              <Archive size={16} className="text-muted-foreground" />
              Historique des locations ({history.length})
            </span>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && (
            <div className="border-t divide-y">
              {history.slice().reverse().map((r) => {
                const v = vehicles.find((x) => x.id === r.vehicleId);
                const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">{v?.photo ?? "🚗"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v ? `${v.brand} ${v.model}` : "Véhicule"} · {r.customer}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.startDate).toLocaleDateString("fr-FR")} → {new Date(r.endDate).toLocaleDateString("fr-FR")}
                        {r.returnedAt ? ` · retourné le ${new Date(r.returnedAt).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <span className="font-bold text-sm shrink-0">{formatFCFA(days * r.dailyRate)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sélection du véhicule puis contrat complet */}
      <Dialog open={openPicker} onOpenChange={setOpenPicker}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau contrat de location</DialogTitle>
            <DialogDescription>Choisissez le véhicule à louer, puis complétez le contrat détaillé.</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Label>Véhicule disponible</Label>
            <Select value={pickedId} onValueChange={setPickedId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {availableVehicles.map((x) => (
                  <SelectItem key={x.id} value={x.id}>{x.brand} {x.model} — {x.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenPicker(false)}>Retour</Button>
            <Button onClick={confirmPick}>Continuer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RentVehicleDialog vehicle={rentVehicle} open={!!rentVehicleId} onOpenChange={(o) => !o && setRentVehicleId(null)} />
      <ReturnRentalDialog rentalId={returnId} vehicle={returnVehicle} open={!!returnId} onOpenChange={(o) => !o && setReturnId(null)} onConfirm={confirmReturn} />
    </div>
  );
}

function Kpi({ label, value, valueText, icon, tone }: { label: string; value?: number; valueText?: string; icon: React.ReactNode; tone?: "rose" }) {
  const cls = tone === "rose"
    ? "bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200"
    : "bg-white/70 border-slate-200/60";
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-xl tabular-nums">{valueText ?? value}</p>
    </div>
  );
}
