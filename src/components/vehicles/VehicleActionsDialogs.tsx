import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User2, CalendarDays, Wallet, ClipboardCheck, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  startRental, sellVehicle, startVehicleMaintenance,
  addVehicleCreditPayment, db,
} from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import type { Vehicle, VehicleCredit } from "@/lib/demo-data";

const glass = "backdrop-blur-xl bg-white/85 dark:bg-slate-900/80 border border-white/40 dark:border-white/10";

/* -------- Louer ------------------------------------------------------- */
const RENT_STEPS = [
  { key: "client", label: "Client", icon: User2 },
  { key: "loc", label: "Période", icon: CalendarDays },
  { key: "fin", label: "Financier", icon: Wallet },
  { key: "recap", label: "Récapitulatif", icon: ClipboardCheck },
];

export function RentVehicleDialog({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open) {
      setStep(0);
      setF({
        customer: "", phone: "", address: "", idDocument: "", licenseNumber: "",
        startDate: today, endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        startTime: "09:00", endTime: "18:00",
        dailyRate: 35000, deposit: 200000, advance: 0, notes: "",
      });
    }
  }, [open]);

  if (!vehicle) return null;
  const days = Math.max(1, Math.round((+new Date(f.endDate || today) - +new Date(f.startDate || today)) / 86400000));
  const total = days * (f.dailyRate || 0);
  const remaining = total - (f.advance || 0);

  const canNext = () => {
    if (step === 0) return !!f.customer?.trim();
    if (step === 1) return !!f.startDate && !!f.endDate && +new Date(f.endDate) >= +new Date(f.startDate);
    if (step === 2) return (f.dailyRate || 0) > 0;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      if (step === 0) return toast.error("Nom du client requis");
      if (step === 1) return toast.error("Dates invalides");
      if (step === 2) return toast.error("Tarif journalier requis");
    }
    setStep((s) => Math.min(RENT_STEPS.length - 1, s + 1));
  };

  const submit = () => {
    if (!f.customer) return toast.error("Nom du client requis");
    startRental({
      vehicleId: vehicle.id,
      customer: f.customer, phone: f.phone, address: f.address,
      idDocument: f.idDocument, licenseNumber: f.licenseNumber,
      startDate: f.startDate, endDate: f.endDate, startTime: f.startTime, endTime: f.endTime,
      dailyRate: f.dailyRate, deposit: f.deposit, advance: f.advance,
      totalAmount: total, remaining, notes: f.notes,
      status: "active",
    });
    toast.success(`${vehicle.brand} ${vehicle.model} loué à ${f.customer}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl p-0 gap-0 ${glass} max-h-[92vh] overflow-hidden flex flex-col`}>
        {/* Header véhicule */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/50 text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 text-2xl">
              {vehicle.image ? <img src={vehicle.image} alt="" className="w-full h-full object-cover" /> : (vehicle.photo ?? "🚗")}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base sm:text-lg">Location — {vehicle.brand} {vehicle.model}</DialogTitle>
              <DialogDescription className="truncate text-xs">{vehicle.plate} · étape {step + 1} sur {RENT_STEPS.length}</DialogDescription>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-1.5">
            {RENT_STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const activeS = i === step;
              return (
                <div key={s.key} className="flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => i <= step && setStep(i)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      activeS ? "bg-primary text-primary-foreground shadow-sm"
                        : done ? "bg-primary/10 text-primary"
                        : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {done ? <Check size={13} className="shrink-0" /> : <Icon size={13} className="shrink-0" />}
                    <span className="truncate hidden sm:inline">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Nom complet *</Label><Input autoFocus value={f.customer || ""} onChange={(e) => setF({ ...f, customer: e.target.value })} placeholder="Ex: Jean Mabiala" /></div>
              <div><Label>Téléphone</Label><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+242 06 000 00 00" /></div>
              <div><Label>N° permis</Label><Input value={f.licenseNumber || ""} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Adresse</Label><Input value={f.address || ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Pièce d'identité (N°)</Label><Input value={f.idDocument || ""} onChange={(e) => setF({ ...f, idDocument: e.target.value })} /></div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Date départ</Label><Input type="date" value={f.startDate || ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
              <div><Label>Date retour prévue</Label><Input type="date" value={f.endDate || ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
              <div><Label>Heure départ</Label><Input type="time" value={f.startTime || ""} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></div>
              <div><Label>Heure retour</Label><Input type="time" value={f.endTime || ""} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></div>
              <div className="sm:col-span-2 flex gap-2 flex-wrap">
                {[1, 3, 7, 30].map((d) => (
                  <Button key={d} type="button" size="sm" variant="outline"
                    onClick={() => setF({ ...f, endDate: new Date(+new Date(f.startDate || today) + d * 86400000).toISOString().slice(0, 10) })}>
                    {d === 30 ? "1 mois" : `${d} j`}
                  </Button>
                ))}
              </div>
              <div className="sm:col-span-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm flex justify-between">
                <span className="text-muted-foreground">Durée calculée</span><strong>{days} jour{days > 1 ? "s" : ""}</strong>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Tarif / jour (FCFA)</Label><MoneyInput value={f.dailyRate} onChange={(v) => setF({ ...f, dailyRate: v })} /></div>
              <div><Label>Caution</Label><MoneyInput value={f.deposit} onChange={(v) => setF({ ...f, deposit: v })} /></div>
              <div><Label>Avance versée</Label><MoneyInput value={f.advance} onChange={(v) => setF({ ...f, advance: v })} /></div>
              <div><Label>Mode de paiement</Label>
                <Select value={f.method || "Cash"} onValueChange={(v) => setF({ ...f, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Cash", "Wave", "Orange Money", "Virement", "Chèque"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div className="p-3 rounded-xl bg-muted flex justify-between text-sm"><span>Total ({days}j)</span><strong>{formatFCFA(total)}</strong></div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex justify-between text-sm"><span>Reste à payer</span><strong className="text-amber-700">{formatFCFA(remaining)}</strong></div>
              </div>
              <div className="sm:col-span-2"><Label>Notes / conditions</Label><Textarea rows={2} value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Kilométrage illimité, carburant plein au retour..." /></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <RecapBlock title="Client" rows={[
                ["Nom", f.customer || "—"], ["Téléphone", f.phone || "—"],
                ["Permis", f.licenseNumber || "—"], ["Pièce", f.idDocument || "—"],
                ["Adresse", f.address || "—"],
              ]} />
              <RecapBlock title="Période" rows={[
                ["Départ", `${new Date(f.startDate).toLocaleDateString("fr-FR")} à ${f.startTime}`],
                ["Retour prévu", `${new Date(f.endDate).toLocaleDateString("fr-FR")} à ${f.endTime}`],
                ["Durée", `${days} jour${days > 1 ? "s" : ""}`],
              ]} />
              <RecapBlock title="Financier" rows={[
                ["Tarif / jour", formatFCFA(f.dailyRate || 0)],
                ["Caution", formatFCFA(f.deposit || 0)],
                ["Avance", formatFCFA(f.advance || 0)],
                ["Mode", f.method || "Cash"],
              ]} />
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase font-bold text-muted-foreground">Total location</p>
                  <p className="font-display font-bold text-2xl">{formatFCFA(total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase font-bold text-muted-foreground">Reste à payer</p>
                  <p className="font-bold text-lg text-amber-700">{formatFCFA(remaining)}</p>
                </div>
              </div>
              {f.notes && <p className="text-xs text-muted-foreground italic">{f.notes}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-border/50 flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep((s) => s - 1))} className="gap-1">
            {step === 0 ? "Annuler" : (<><ChevronLeft size={16} /> Précédent</>)}
          </Button>
          {step < RENT_STEPS.length - 1 ? (
            <Button onClick={next} className="gap-1">Suivant <ChevronRight size={16} /></Button>
          ) : (
            <Button onClick={submit} className="gap-1"><Check size={16} /> Confirmer la location</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecapBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 overflow-hidden">
      <p className="px-3 py-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/50">{title}</p>
      <div className="divide-y divide-border/50">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-muted-foreground shrink-0">{k}</span>
            <span className="font-medium text-right truncate">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* -------- Vendre ------------------------------------------------------ */
export function SellVehicleDialog({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open && vehicle) setF({
      customer: "", phone: "", amount: vehicle.sellingPrice, payment: "cash",
      downPayment: 0, monthlyPayment: 0, totalMonths: 12,
    });
  }, [open, vehicle]);
  if (!vehicle) return null;

  const submit = () => {
    if (!f.customer) return toast.error("Nom du client requis");
    if (f.payment === "credit") {
      const credit = db.add("vehicleCredits", {
        vehicleId: vehicle.id, customer: f.customer,
        total: f.amount, downPayment: f.downPayment, monthlyPayment: f.monthlyPayment,
        paidMonths: 0, totalMonths: f.totalMonths,
        nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: "ok",
      });
      const sale = sellVehicle({ vehicleId: vehicle.id, customer: f.customer, phone: f.phone, amount: f.amount, payment: "credit" });
      db.update("vehicleSales", sale.id, { creditId: credit.id });
      toast.success("Vente à crédit enregistrée");
    } else {
      sellVehicle({ vehicleId: vehicle.id, customer: f.customer, phone: f.phone, amount: f.amount, payment: "cash" });
      toast.success("Vente enregistrée");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg ${glass}`}>
        <DialogHeader>
          <DialogTitle>Vendre — {vehicle.brand} {vehicle.model}</DialogTitle>
          <DialogDescription>Vente cash ou à crédit, le véhicule passera automatiquement en "Vendu".</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2"><Label>Client *</Label><Input value={f.customer || ""} onChange={(e) => setF({ ...f, customer: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Montant total</Label><MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></div>
          <div className="col-span-2"><Label>Mode</Label>
            <Select value={f.payment} onValueChange={(v) => setF({ ...f, payment: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cash">Cash / Comptant</SelectItem><SelectItem value="credit">À crédit</SelectItem></SelectContent>
            </Select>
          </div>
          {f.payment === "credit" && (
            <>
              <div><Label>Apport initial</Label><MoneyInput value={f.downPayment} onChange={(v) => setF({ ...f, downPayment: v })} /></div>
              <div><Label>Durée (mois)</Label><Input type="number" value={f.totalMonths || 12} onChange={(e) => setF({ ...f, totalMonths: +e.target.value })} /></div>
              <div className="col-span-2"><Label>Mensualité</Label><MoneyInput value={f.monthlyPayment} onChange={(v) => setF({ ...f, monthlyPayment: v })} /></div>
              <div className="col-span-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-sm flex justify-between">
                <span>Reste après apport</span><strong>{formatFCFA(Math.max(0, (f.amount || 0) - (f.downPayment || 0)))}</strong>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Valider la vente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Maintenance ------------------------------------------------- */
export function MaintenanceVehicleDialog({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open) setF({
      motif: "", type: "Réparation", garage: "", priority: "medium",
      dateIn: new Date().toISOString().slice(0, 10),
      status: "pending", partsCost: 0, laborCost: 0, otherCost: 0, notes: "",
    });
  }, [open]);
  if (!vehicle) return null;

  const submit = () => {
    if (!f.motif) return toast.error("Motif requis");
    startVehicleMaintenance({ ...f, vehicleId: vehicle.id });
    toast.success("Véhicule placé en maintenance");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-xl ${glass}`}>
        <DialogHeader>
          <DialogTitle>Maintenance — {vehicle.brand} {vehicle.model}</DialogTitle>
          <DialogDescription>Le véhicule sera marqué comme indisponible.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2"><Label>Motif *</Label><Input value={f.motif || ""} onChange={(e) => setF({ ...f, motif: e.target.value })} placeholder="Ex: Panne moteur" /></div>
          <div><Label>Type</Label>
            <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Vidange", "Pneus", "Freins", "Révision", "Réparation", "Carrosserie", "Autre"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Priorité</Label>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="low">Basse</SelectItem><SelectItem value="medium">Moyenne</SelectItem><SelectItem value="high">Haute</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Garage / Technicien</Label><Input value={f.garage || ""} onChange={(e) => setF({ ...f, garage: e.target.value })} /></div>
          <div><Label>Date entrée</Label><Input type="date" value={f.dateIn || ""} onChange={(e) => setF({ ...f, dateIn: e.target.value })} /></div>
          <div><Label>Date sortie prévue</Label><Input type="date" value={f.dateOut || ""} onChange={(e) => setF({ ...f, dateOut: e.target.value })} /></div>
          <div><Label>Pièces</Label><MoneyInput value={f.partsCost} onChange={(v) => setF({ ...f, partsCost: v })} /></div>
          <div><Label>Main-d'œuvre</Label><MoneyInput value={f.laborCost} onChange={(v) => setF({ ...f, laborCost: v })} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Retour location -------------------------------------------- */
export function ReturnRentalDialog({ rentalId, vehicle, open, onOpenChange, onConfirm }: {
  rentalId: string | null; vehicle: Vehicle | null;
  open: boolean; onOpenChange: (v: boolean) => void;
  onConfirm: (data: { returnedAt: string; returnKm?: number; fuelLevel?: string; conditionNote?: string }) => void;
}) {
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open) setF({ returnedAt: new Date().toISOString().slice(0, 10), returnKm: vehicle?.mileageKm || 0, fuelLevel: "Plein", conditionNote: "" });
  }, [open, vehicle]);
  if (!rentalId) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg ${glass}`}>
        <DialogHeader>
          <DialogTitle>Retour du véhicule</DialogTitle>
          <DialogDescription>Le véhicule redeviendra disponible automatiquement.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div><Label>Date réelle de retour</Label><Input type="date" value={f.returnedAt || ""} onChange={(e) => setF({ ...f, returnedAt: e.target.value })} /></div>
          <div><Label>Kilométrage retour</Label><Input type="number" value={f.returnKm || 0} onChange={(e) => setF({ ...f, returnKm: +e.target.value })} /></div>
          <div className="col-span-2"><Label>Niveau carburant</Label>
            <Select value={f.fuelLevel} onValueChange={(v) => setF({ ...f, fuelLevel: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Plein", "3/4", "1/2", "1/4", "Vide"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>État / Observations</Label><Textarea rows={3} value={f.conditionNote || ""} onChange={(e) => setF({ ...f, conditionNote: e.target.value })} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onConfirm(f); onOpenChange(false); }}>Valider le retour</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Paiement crédit -------------------------------------------- */
export function CreditPaymentDialog({ credit, open, onOpenChange }: { credit: VehicleCredit | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open && credit) setF({ amount: credit.monthlyPayment, date: new Date().toISOString().slice(0, 10), method: "Cash", note: "" });
  }, [open, credit]);
  if (!credit) return null;
  const submit = () => {
    if (!f.amount) return toast.error("Montant requis");
    addVehicleCreditPayment(credit.id, { amount: f.amount, date: f.date, method: f.method, note: f.note });
    toast.success("Paiement enregistré");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${glass}`}>
        <DialogHeader>
          <DialogTitle>Nouveau paiement</DialogTitle>
          <DialogDescription>Crédit de {credit.customer} — {formatFCFA(credit.total)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div><Label>Montant</Label><MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></div>
          <div><Label>Date</Label><Input type="date" value={f.date || ""} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="col-span-2"><Label>Méthode</Label>
            <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Cash", "Wave", "Orange Money", "Virement", "Chèque"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Note</Label><Input value={f.note || ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Enregistrer le paiement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
