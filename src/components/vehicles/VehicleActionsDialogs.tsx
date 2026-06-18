import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  startRental, sellVehicle, startVehicleMaintenance,
  addVehicleCreditPayment, db,
} from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import type { Vehicle, VehicleCredit } from "@/lib/demo-data";

const glass = "backdrop-blur-xl bg-white/85 dark:bg-slate-900/80 border border-white/40 dark:border-white/10";

/* -------- Louer ------------------------------------------------------- */
export function RentVehicleDialog({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState("client");
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (open) {
      setTab("client");
      setF({
        customer: "", phone: "", address: "", idDocument: "", licenseNumber: "",
        startDate: today, endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        startTime: "09:00", endTime: "18:00",
        dailyRate: 35000, deposit: 200000, advance: 0,
      });
    }
  }, [open]);

  if (!vehicle) return null;
  const days = Math.max(1, Math.round((+new Date(f.endDate || today) - +new Date(f.startDate || today)) / 86400000));
  const total = days * (f.dailyRate || 0);
  const remaining = total - (f.advance || 0);

  const submit = () => {
    if (!f.customer) return toast.error("Nom du client requis");
    startRental({
      vehicleId: vehicle.id,
      customer: f.customer, phone: f.phone, address: f.address,
      idDocument: f.idDocument, licenseNumber: f.licenseNumber,
      startDate: f.startDate, endDate: f.endDate, startTime: f.startTime, endTime: f.endTime,
      dailyRate: f.dailyRate, deposit: f.deposit, advance: f.advance,
      totalAmount: total, remaining,
      status: "active",
    });
    toast.success(`${vehicle.brand} ${vehicle.model} loué à ${f.customer}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${glass} max-h-[92vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Louer — {vehicle.brand} {vehicle.model}</DialogTitle>
          <DialogDescription>Saisissez les informations du client et de la location.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="loc">Location</TabsTrigger>
            <TabsTrigger value="fin">Financier</TabsTrigger>
          </TabsList>
          <TabsContent value="client" className="grid grid-cols-2 gap-3 mt-4">
            <div className="col-span-2"><Label>Nom complet *</Label><Input value={f.customer || ""} onChange={(e) => setF({ ...f, customer: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>N° permis</Label><Input value={f.licenseNumber || ""} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })} /></div>
            <div className="col-span-2"><Label>Adresse</Label><Input value={f.address || ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div className="col-span-2"><Label>Pièce d'identité (N°)</Label><Input value={f.idDocument || ""} onChange={(e) => setF({ ...f, idDocument: e.target.value })} /></div>
          </TabsContent>
          <TabsContent value="loc" className="grid grid-cols-2 gap-3 mt-4">
            <div><Label>Date départ</Label><Input type="date" value={f.startDate || ""} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
            <div><Label>Date retour prévue</Label><Input type="date" value={f.endDate || ""} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
            <div><Label>Heure départ</Label><Input type="time" value={f.startTime || ""} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></div>
            <div><Label>Heure retour</Label><Input type="time" value={f.endTime || ""} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></div>
            <div className="col-span-2 p-3 rounded-lg bg-primary/5 text-sm flex justify-between"><span>Durée</span><strong>{days} jours</strong></div>
          </TabsContent>
          <TabsContent value="fin" className="grid grid-cols-2 gap-3 mt-4">
            <div><Label>Tarif / jour</Label><Input type="number" value={f.dailyRate || 0} onChange={(e) => setF({ ...f, dailyRate: +e.target.value })} /></div>
            <div><Label>Caution</Label><Input type="number" value={f.deposit || 0} onChange={(e) => setF({ ...f, deposit: +e.target.value })} /></div>
            <div><Label>Avance versée</Label><Input type="number" value={f.advance || 0} onChange={(e) => setF({ ...f, advance: +e.target.value })} /></div>
            <div className="col-span-2 grid grid-cols-2 gap-2 mt-2">
              <div className="p-3 rounded-lg bg-muted flex justify-between"><span>Total</span><strong>{formatFCFA(total)}</strong></div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex justify-between"><span>Reste à payer</span><strong className="text-amber-700">{formatFCFA(remaining)}</strong></div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Confirmer la location</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <div><Label>Montant total</Label><Input type="number" value={f.amount || 0} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></div>
          <div className="col-span-2"><Label>Mode</Label>
            <Select value={f.payment} onValueChange={(v) => setF({ ...f, payment: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cash">Cash / Comptant</SelectItem><SelectItem value="credit">À crédit</SelectItem></SelectContent>
            </Select>
          </div>
          {f.payment === "credit" && (
            <>
              <div><Label>Apport initial</Label><Input type="number" value={f.downPayment || 0} onChange={(e) => setF({ ...f, downPayment: +e.target.value })} /></div>
              <div><Label>Durée (mois)</Label><Input type="number" value={f.totalMonths || 12} onChange={(e) => setF({ ...f, totalMonths: +e.target.value })} /></div>
              <div className="col-span-2"><Label>Mensualité</Label><Input type="number" value={f.monthlyPayment || 0} onChange={(e) => setF({ ...f, monthlyPayment: +e.target.value })} /></div>
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
          <div><Label>Pièces</Label><Input type="number" value={f.partsCost || 0} onChange={(e) => setF({ ...f, partsCost: +e.target.value })} /></div>
          <div><Label>Main-d'œuvre</Label><Input type="number" value={f.laborCost || 0} onChange={(e) => setF({ ...f, laborCost: +e.target.value })} /></div>
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
          <div><Label>Montant</Label><Input type="number" value={f.amount || 0} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></div>
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
