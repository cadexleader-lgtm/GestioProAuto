import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCollection, db, type VehicleSale } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import {
  User, FileText, Car, Wallet, KeyRound, CheckCircle2,
  Upload, Trash2, Check, ChevronLeft, ChevronRight, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Doc = NonNullable<VehicleSale["documents"]>[number];

const STEPS = [
  { id: 1, label: "Client", icon: User },
  { id: 2, label: "Documents", icon: FileText },
  { id: 3, label: "Véhicule & Vente", icon: Car },
  { id: 4, label: "Paiement", icon: Wallet },
  { id: 5, label: "Remise des clés", icon: KeyRound },
  { id: 6, label: "Finalisation", icon: CheckCircle2 },
];

export function SaleWorkflowDialog({ open, onOpenChange }: Props) {
  const vehicles = useCollection("vehicles");
  const availables = vehicles.filter((v) => v.status === "available");
  const [step, setStep] = useState(1);

  // Step 1
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cin, setCin] = useState("");

  // Step 2
  const [documents, setDocuments] = useState<Doc[]>([]);

  // Step 3
  const [vehicleId, setVehicleId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [payment, setPayment] = useState<"cash" | "credit">("cash");
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);

  // Step 4
  const [method, setMethod] = useState<"Cash" | "Wave" | "Orange Money" | "Virement" | "Chèque">("Cash");
  const [downPayment, setDownPayment] = useState<number>(0);
  const [months, setMonths] = useState<number>(12);

  // Step 5
  const today = new Date().toISOString().slice(0, 10);
  const [deliveryDate, setDeliveryDate] = useState<string>(today);
  const [deliveryKm, setDeliveryKm] = useState<number>(0);
  const [fuelLevel, setFuelLevel] = useState<string>("Plein");
  const [conditionNote, setConditionNote] = useState("");
  const [signed, setSigned] = useState(false);

  // Step 6
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [techControlExpiry, setTechControlExpiry] = useState("");

  const monthly = payment === "credit" && months > 0
    ? Math.round((amount - downPayment) / months) : 0;

  const canNext = () => {
    switch (step) {
      case 1: return customer.trim().length >= 2 && phone.trim().length >= 6;
      case 2: return true;
      case 3: return !!vehicleId && amount > 0;
      case 4: return payment === "cash" ? amount > 0 : downPayment >= 0 && months > 0;
      case 5: return !!deliveryDate && signed;
      default: return true;
    }
  };

  const reset = () => {
    setStep(1); setCustomer(""); setPhone(""); setAddress(""); setCin("");
    setDocuments([]); setVehicleId(""); setAmount(0); setPayment("cash");
    setMethod("Cash"); setDownPayment(0); setMonths(12);
    setDeliveryDate(today); setDeliveryKm(0); setFuelLevel("Plein");
    setConditionNote(""); setSigned(false);
    setInsuranceExpiry(""); setTechControlExpiry("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}: fichier > 5MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      setDocuments((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: f.name, type: f.type, dataUrl, uploadedAt: new Date().toISOString(), size: f.size },
      ]);
    }
  };

  const finalize = () => {
    if (!selectedVehicle) return;
    const financed = amount - downPayment;
    let creditId: string | undefined;
    if (payment === "credit" && financed > 0) {
      const nextDue = new Date(); nextDue.setMonth(nextDue.getMonth() + 1);
      const credit = db.add("vehicleCredits", {
        vehicleId,
        customer,
        total: amount,
        downPayment,
        monthlyPayment: monthly,
        paidMonths: 0,
        totalMonths: months,
        nextDueDate: nextDue.toISOString().slice(0, 10),
        status: "ok",
      });
      creditId = credit.id;
    }

    db.add("vehicleSales", {
      vehicleId,
      customer,
      phone,
      address,
      cin,
      amount,
      date: today,
      payment,
      method,
      downPayment: payment === "credit" ? downPayment : amount,
      creditId,
      documents,
      delivery: { date: deliveryDate, km: deliveryKm, fuelLevel, conditionNote, signed },
      reminders: {
        insuranceExpiry: insuranceExpiry || undefined,
        techControlExpiry: techControlExpiry || undefined,
        nextDueDate: creditId ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10) : undefined,
      },
      status: "done",
    });

    db.update("vehicles", vehicleId, {
      status: "sold",
      insuranceExpiry: insuranceExpiry || selectedVehicle.insuranceExpiry,
      techControlExpiry: techControlExpiry || selectedVehicle.techControlExpiry,
    } as any);

    const cashIn = payment === "cash" ? amount : downPayment;
    if (cashIn > 0) {
      db.add("cash", {
        type: "in",
        label: `Vente véhicule — ${customer} (${selectedVehicle.brand} ${selectedVehicle.model})`,
        amount: cashIn,
        date: new Date().toISOString(),
        source: method,
      });
    }

    toast.success("Vente finalisée avec traçabilité complète");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car size={20} className="text-primary" />
            Nouveau dossier de vente
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-1 py-3 border-y">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition",
                  done ? "bg-emerald-500 border-emerald-500 text-white" :
                  active ? "bg-primary border-primary text-white" :
                  "bg-muted border-border text-muted-foreground",
                )}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={cn("text-[10px] font-semibold truncate hidden sm:block", active ? "text-primary" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1", done ? "bg-emerald-500" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="py-4 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Identification du client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom complet *"><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Ex: Mamadou Diop" /></Field>
                <Field label="Téléphone *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00" /></Field>
                <Field label="Adresse"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ville, quartier" /></Field>
                <Field label="N° CIN / Passeport"><Input value={cin} onChange={(e) => setCin(e.target.value)} /></Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Documents du client & du véhicule</h3>
              <p className="text-xs text-muted-foreground">CIN, contrat, carte grise, assurance, etc. (max 5MB par fichier)</p>
              <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/30 transition">
                <Upload size={28} className="text-muted-foreground" />
                <span className="text-sm font-medium">Glissez ou cliquez pour uploader</span>
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
              {documents.length > 0 && (
                <div className="grid gap-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <FileText size={18} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(d.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setDocuments((p) => p.filter((x) => x.id !== d.id))}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Sélection du véhicule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {availables.length === 0 && <p className="text-sm text-muted-foreground col-span-2">Aucun véhicule disponible.</p>}
                {availables.map((v) => (
                  <button key={v.id} onClick={() => { setVehicleId(v.id); setAmount(v.sellingPrice); setDeliveryKm(v.mileageKm); }}
                    className={cn("p-3 rounded-xl border-2 text-left transition", vehicleId === v.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{v.photo}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{v.brand} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.plate} · {v.year}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary mt-1">{formatFCFA(v.sellingPrice)}</p>
                  </button>
                ))}
              </div>
              {selectedVehicle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <Field label="Prix négocié (FCFA)"><Input type="number" value={amount || ""} onChange={(e) => setAmount(+e.target.value)} /></Field>
                  <Field label="Mode de paiement">
                    <div className="flex gap-2">
                      {(["cash", "credit"] as const).map((p) => (
                        <button key={p} type="button" onClick={() => setPayment(p)}
                          className={cn("flex-1 py-2 rounded-lg border-2 text-sm font-medium", payment === p ? "border-primary bg-primary/5 text-primary" : "border-border")}>
                          {p === "cash" ? "Comptant" : "À crédit"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Modalités de paiement</h3>
              <Field label="Méthode">
                <div className="flex gap-2 flex-wrap">
                  {(["Cash", "Wave", "Orange Money", "Virement", "Chèque"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMethod(m)}
                      className={cn("px-3 py-2 rounded-lg border-2 text-xs font-medium", method === m ? "border-primary bg-primary/5 text-primary" : "border-border")}>
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
              {payment === "credit" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Acompte (FCFA)"><Input type="number" value={downPayment || ""} onChange={(e) => setDownPayment(+e.target.value)} /></Field>
                  <Field label="Durée (mois)"><Input type="number" value={months || ""} onChange={(e) => setMonths(+e.target.value)} /></Field>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Mensualité</p>
                    <p className="font-display font-bold text-primary">{formatFCFA(monthly)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Financé: {formatFCFA(amount - downPayment)}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-sm">Encaissement comptant : <span className="font-bold text-emerald-700">{formatFCFA(amount)}</span></p>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Remise des clés & PV</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date de remise *"><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></Field>
                <Field label="Kilométrage à la remise"><Input type="number" value={deliveryKm || ""} onChange={(e) => setDeliveryKm(+e.target.value)} /></Field>
                <Field label="Niveau carburant">
                  <select value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    {["Vide", "1/4", "1/2", "3/4", "Plein"].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Signature client"><label className="flex items-center gap-2 h-9"><input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} /> <span className="text-sm">PV signé</span></label></Field>
              </div>
              <Field label="État général / observations"><Textarea rows={3} value={conditionNote} onChange={(e) => setConditionNote(e.target.value)} placeholder="Rayures, accessoires remis, doubles clés..." /></Field>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Bell size={16} className="text-primary" />Rappels & suivi après-vente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Expiration assurance"><Input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} /></Field>
                <Field label="Expiration contrôle technique"><Input type="date" value={techControlExpiry} onChange={(e) => setTechControlExpiry(e.target.value)} /></Field>
              </div>
              <div className="rounded-xl border p-4 bg-muted/30 space-y-2">
                <p className="text-sm font-semibold">Récapitulatif</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Client : <span className="text-foreground font-medium">{customer}</span> ({phone})</p>
                  <p>• Véhicule : <span className="text-foreground font-medium">{selectedVehicle?.brand} {selectedVehicle?.model}</span></p>
                  <p>• Montant : <span className="text-foreground font-bold">{formatFCFA(amount)}</span> {payment === "credit" ? `(acompte ${formatFCFA(downPayment)}, ${months} mois)` : `(${method})`}</p>
                  <p>• Documents joints : <Badge variant="secondary">{documents.length}</Badge></p>
                  <p>• Remise : {deliveryDate} — {signed ? "PV signé ✓" : "Non signé"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronLeft size={16} /> Précédent
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep((s) => Math.min(6, s + 1))} disabled={!canNext()}>
              Suivant <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={finalize} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 size={16} /> Finaliser la vente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}
