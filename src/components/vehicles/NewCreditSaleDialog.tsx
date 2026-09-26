import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { recordVehicleCreditSale, useCollection, db } from "@/lib/demo-store";
import { generateCreditSchedule } from "@/lib/vehicle-pdf";
import { formatFCFA } from "@/lib/format";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { PdfPreviewDialog, usePdfPreview } from "@/components/PdfPreviewDialog";

const STEPS = ["Véhicule", "Client", "Financement"] as const;

export function NewCreditSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const vehicles = useCollection("vehicles");
  const available = useMemo(() => vehicles.filter((v) => v.status === "available"), [vehicles]);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [saleId, setSaleId] = useState(() => crypto.randomUUID());
  const [creditId, setCreditId] = useState(() => crypto.randomUUID());
  const [clientSignature, setClientSignature] = useState<string | undefined>(undefined);
  const preview = usePdfPreview();

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setF({
      vehicleId: "",
      customer: "", phone: "", idDocument: "",
      total: 0, downPayment: 0, totalMonths: 12, monthlyPayment: 0,
      firstDueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setIdempotencyKey(crypto.randomUUID());
    setSaleId(crypto.randomUUID());
    setCreditId(crypto.randomUUID());
    setClientSignature(undefined);
  }, [open]);

  const vehicle = vehicles.find((v) => v.id === f.vehicleId);
  useEffect(() => {
    if (vehicle && !f.total) setF((x: any) => ({ ...x, total: vehicle.sellingPrice }));
  }, [vehicle]);

  const financed = Math.max(0, (f.total || 0) - (f.downPayment || 0));
  const suggestedMonthly = f.totalMonths > 0 ? Math.ceil(financed / f.totalMonths) : 0;

  const next = () => {
    if (step === 0 && !f.vehicleId) return toast.error("Sélectionnez un véhicule");
    if (step === 1 && !f.customer) return toast.error("Nom du client requis");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async () => {
    if (!f.vehicleId || !f.customer || !f.total) return toast.error("Champs requis manquants");
    const soldVehicle = vehicle;
    if (!soldVehicle) return;
    const monthly = f.monthlyPayment || suggestedMonthly;
    setSubmitting(true);
    try {
      await recordVehicleCreditSale({
        saleId,
        creditId,
        vehicleId: f.vehicleId,
        customer: f.customer,
        phone: f.phone,
        idDocument: f.idDocument,
        total: f.total,
        downPayment: f.downPayment || 0,
        totalMonths: f.totalMonths,
        monthlyPayment: monthly,
        firstDueDate: f.firstDueDate,
        currency: "XOF",
        method: "Cash",
        idempotencyKey,
        metadata: clientSignature ? { signatures: { client: clientSignature, signedAt: new Date().toISOString() } } : undefined,
      });
      toast.success("Vente à crédit créée");
      onOpenChange(false);
      const credit = db.list("vehicleCredits").find((c) => c.id === creditId);
      if (credit) {
        generateCreditSchedule(credit, soldVehicle, [])
          .then((doc) => preview.show(doc, `contrat-credit-${creditId}`, `Échéancier de crédit — ${soldVehicle.brand} ${soldVehicle.model}`))
          .catch((error) => toast.error(error instanceof Error ? error.message : "L'échéancier n'a pas pu être généré."));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La vente à crédit a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto backdrop-blur-xl bg-white/90 dark:bg-slate-900/85">
        <DialogHeader>
          <DialogTitle>Nouvelle vente à crédit</DialogTitle>
          <DialogDescription>Créer le contrat, le véhicule passera en « Vendu » automatiquement.</DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-2 my-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              }`}>{i < step ? <Check size={12} /> : i + 1}</span>
              <span className={`text-xs font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-3">
            <div><Label>Véhicule disponible *</Label>
              <Select value={f.vehicleId} onValueChange={(v) => setF({ ...f, vehicleId: v, total: 0 })}>
                <SelectTrigger><SelectValue placeholder="Choisir un véhicule…" /></SelectTrigger>
                <SelectContent>
                  {available.length === 0 && <div className="p-4 text-xs text-muted-foreground">Aucun véhicule disponible</div>}
                  {available.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} · {v.year} · {v.plate} — {formatFCFA(v.sellingPrice)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {vehicle && (
              <div className="p-3 rounded-lg border bg-muted/40 flex items-center gap-3">
                <div className="text-3xl">{vehicle.image ? <img src={vehicle.image} className="w-12 h-12 rounded object-cover" /> : vehicle.photo}</div>
                <div className="text-sm">
                  <p className="font-semibold">{vehicle.brand} {vehicle.model}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.year} · {vehicle.color} · {vehicle.plate}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nom du client *</Label><Input value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Pièce d'identité (N°)</Label><Input value={f.idDocument} onChange={(e) => setF({ ...f, idDocument: e.target.value })} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Montant total *</Label><Input type="number" value={f.total || 0} onChange={(e) => setF({ ...f, total: +e.target.value })} /></div>
            <div><Label>Apport initial</Label><Input type="number" value={f.downPayment || 0} onChange={(e) => setF({ ...f, downPayment: +e.target.value })} /></div>
            <div><Label>Durée (mois)</Label><Input type="number" value={f.totalMonths} onChange={(e) => setF({ ...f, totalMonths: +e.target.value })} /></div>
            <div><Label>1ère échéance</Label><Input type="date" value={f.firstDueDate} onChange={(e) => setF({ ...f, firstDueDate: e.target.value })} /></div>
            <div className="col-span-2"><Label>Mensualité <span className="text-xs text-muted-foreground">(suggérée {formatFCFA(suggestedMonthly)})</span></Label>
              <Input type="number" value={f.monthlyPayment || suggestedMonthly} onChange={(e) => setF({ ...f, monthlyPayment: +e.target.value })} /></div>
            <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
              <div className="p-3 rounded-lg bg-muted text-sm flex justify-between"><span>À financer</span><strong>{formatFCFA(financed)}</strong></div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-sm flex justify-between"><span>Total échéances</span><strong className="text-emerald-700">{formatFCFA((f.monthlyPayment || suggestedMonthly) * f.totalMonths)}</strong></div>
            </div>
            <div className="col-span-2">
              <SignaturePad label="Signature du client" value={clientSignature} onChange={setClientSignature} height={130} />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex-row justify-between gap-2">
          <div>{step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}><ChevronLeft size={14} /> Précédent</Button>}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Suivant <ChevronRight size={14} /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting}><Check size={14} /> Créer le crédit</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PdfPreviewDialog open={preview.open} onOpenChange={preview.onOpenChange} url={preview.url} filename={preview.filename} title={preview.title} />
    </>
  );
}
