import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/demo-store";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Upload, FileText, Download, Trash2 } from "lucide-react";
import type { Vehicle } from "@/lib/demo-data";

/* ================== VEHICLE WIZARD (Add + Edit + Documents) ================== */
const STEPS = [
  { key: "g", label: "Général" },
  { key: "t", label: "Technique" },
  { key: "f", label: "Finances" },
  { key: "d", label: "Papiers" },
  { key: "a", label: "Archives" },
];

export function VehicleDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle?: Vehicle | null;
}) {
  const isEdit = !!vehicle;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(
      vehicle
        ? { ...vehicle, documents: vehicle.documents || [] }
        : {
            brand: "", model: "", year: new Date().getFullYear(), color: "Blanc",
            vin: "", plate: "", mileageKm: 0, fuel: "Essence", transmission: "Manuelle",
            purchasePrice: 0, importFees: 0, customsFees: 0, repairFees: 0, maintenanceFees: 0,
            sellingPrice: 0, status: "available", photo: "🚗",
            insuranceExpiry: "", techControlExpiry: "", carteGrise: "",
            image: "", notes: "", documents: [],
          },
    );
  }, [open, vehicle]);

  const total = (form.purchasePrice || 0) + (form.importFees || 0) + (form.customsFees || 0) + (form.repairFees || 0) + (form.maintenanceFees || 0);
  const margin = (form.sellingPrice || 0) - total;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) return toast.error("Image trop volumineuse (max 2.5 Mo)");
    const r = new FileReader();
    r.onload = () => setForm((f: any) => ({ ...f, image: r.result as string }));
    r.readAsDataURL(file);
  };

  const handleDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5_000_000) {
        toast.error(`${file.name} : trop volumineux (max 5 Mo)`);
        return;
      }
      const r = new FileReader();
      r.onload = () => {
        setForm((f: any) => ({
          ...f,
          documents: [
            ...(f.documents || []),
            {
              id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              type: file.type || "application/octet-stream",
              size: file.size,
              dataUrl: r.result as string,
              uploadedAt: new Date().toISOString(),
            },
          ],
        }));
      };
      r.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeDoc = (id: string) =>
    setForm((f: any) => ({ ...f, documents: f.documents.filter((d: any) => d.id !== id) }));

  const downloadDoc = (d: any) => {
    const a = document.createElement("a");
    a.href = d.dataUrl;
    a.download = d.name;
    a.click();
  };

  const canNext = () => {
    if (step === 0) return !!form.brand && !!form.model;
    return true;
  };

  const next = () => {
    if (!canNext()) return toast.error("Marque et modèle requis");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = () => {
    if (!form.brand || !form.model) {
      setStep(0);
      return toast.error("Marque et modèle requis");
    }
    if (isEdit && vehicle) {
      db.update("vehicles", vehicle.id, form);
      toast.success("Véhicule mis à jour");
    } else {
      db.add("vehicles", form);
      toast.success("Véhicule ajouté");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifier — ${vehicle?.brand} ${vehicle?.model}` : "Nouveau véhicule"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <ol className="flex items-center gap-1 sm:gap-2 mt-2 mb-4 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : done
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-muted text-muted-foreground border-transparent"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    active ? "bg-white/20" : done ? "bg-emerald-500 text-white" : "bg-background"
                  }`}>{done ? <Check size={12} /> : i + 1}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
              </li>
            );
          })}
        </ol>

        {/* STEP 0 — Général */}
        {step === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <Label>Photo du véhicule</Label>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-3xl shrink-0">
                  {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : form.photo}
                </div>
                <Input type="file" accept="image/*" onChange={handleImage} />
                {form.image && <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, image: "" })}>Retirer</Button>}
              </div>
            </div>
            <div><Label>Marque *</Label><Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Modèle *</Label><Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Année</Label><Input type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: +e.target.value })} /></div>
            <div><Label>Couleur</Label><Input value={form.color || ""} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div><Label>Plaque</Label><Input value={form.plate || ""} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
            <div className="col-span-2 sm:col-span-3"><Label>VIN / N° châssis</Label><Input value={form.vin || ""} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></div>
            <div><Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="sold">Vendu</SelectItem>
                  <SelectItem value="rented">Loué</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Emoji (fallback)</Label><Input className="text-2xl text-center" value={form.photo || ""} onChange={(e) => setForm({ ...form, photo: e.target.value })} /></div>
          </div>
        )}

        {/* STEP 1 — Technique */}
        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><Label>Kilométrage</Label><Input type="number" value={form.mileageKm || 0} onChange={(e) => setForm({ ...form, mileageKm: +e.target.value })} /></div>
            <div><Label>Carburant</Label>
              <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Essence", "Diesel", "Hybride", "Électrique"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Transmission</Label>
              <Select value={form.transmission} onValueChange={(v) => setForm({ ...form, transmission: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Manuelle", "Automatique"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 2 — Finances */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prix d'achat</Label><Input type="number" value={form.purchasePrice || 0} onChange={(e) => setForm({ ...form, purchasePrice: +e.target.value })} /></div>
            <div><Label>Frais import</Label><Input type="number" value={form.importFees || 0} onChange={(e) => setForm({ ...form, importFees: +e.target.value })} /></div>
            <div><Label>Douane</Label><Input type="number" value={form.customsFees || 0} onChange={(e) => setForm({ ...form, customsFees: +e.target.value })} /></div>
            <div><Label>Réparations</Label><Input type="number" value={form.repairFees || 0} onChange={(e) => setForm({ ...form, repairFees: +e.target.value })} /></div>
            <div><Label>Entretien</Label><Input type="number" value={form.maintenanceFees || 0} onChange={(e) => setForm({ ...form, maintenanceFees: +e.target.value })} /></div>
            <div><Label>Prix de vente</Label><Input type="number" value={form.sellingPrice || 0} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} /></div>
            <div className="col-span-2 p-3 bg-muted rounded-lg flex justify-between"><span>Coût total</span><strong>{total.toLocaleString()} FCFA</strong></div>
            <div className="col-span-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex justify-between"><span>Marge prévue</span><strong className="text-emerald-700 dark:text-emerald-400">{margin.toLocaleString()} FCFA</strong></div>
          </div>
        )}

        {/* STEP 3 — Papiers */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>N° Carte grise</Label><Input value={form.carteGrise || ""} onChange={(e) => setForm({ ...form, carteGrise: e.target.value })} /></div>
            <div><Label>Expiration assurance</Label><Input type="date" value={form.insuranceExpiry || ""} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} /></div>
            <div><Label>Expiration visite technique</Label><Input type="date" value={form.techControlExpiry || ""} onChange={(e) => setForm({ ...form, techControlExpiry: e.target.value })} /></div>
          </div>
        )}

        {/* STEP 4 — Archives / Documents */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-dashed p-6 text-center bg-muted/30">
              <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Carte grise, assurance, contrats, factures…</p>
              <p className="text-xs text-muted-foreground mb-3">PDF, images — max 5 Mo par fichier</p>
              <Label htmlFor="doc-upload" className="inline-block">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90">
                  <Upload size={14} /> Choisir des fichiers
                </span>
                <input id="doc-upload" type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={handleDocs} />
              </Label>
            </div>

            {(form.documents?.length || 0) === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun document</p>
            ) : (
              <ul className="space-y-2">
                {form.documents.map((d: any) => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white/60 dark:bg-slate-900/40">
                    <FileText size={18} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(d.size / 1024).toFixed(0)} Ko · {new Date(d.uploadedAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => downloadDoc(d)}><Download size={14} /></Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeDoc(d.id)}><Trash2 size={14} className="text-rose-600" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between gap-2">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft size={14} /> Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Suivant <ChevronRight size={14} /></Button>
            ) : (
              <Button onClick={submit}><Check size={14} /> {isEdit ? "Enregistrer les modifications" : "Créer le véhicule"}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================== APPLIANCE ================== */
export function ApplianceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { setForm({ name: "", category: "Réfrigérateur", brand: "", reference: "", price: 0, cost: 0, stock: 0, warrantyMonths: 24, emoji: "🧊", energyClass: "A++", trackBySerial: true }); }, [open]);
  const submit = () => {
    if (!form.name) return toast.error("Nom requis");
    db.add("appliances", form);
    toast.success("Produit ajouté");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nouvel appareil électroménager</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="col-span-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Réfrigérateur", "Téléviseur", "Climatiseur", "Congélateur", "Machine à laver", "Cuisinière", "Ventilateur", "Micro-ondes"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Marque</Label>
            <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{["Samsung", "LG", "Hisense", "Haier", "Beko", "Brandt", "Sharp", "Whirlpool", "Sony", "TCL"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div><Label>Classe énergétique</Label><Input value={form.energyClass} onChange={(e) => setForm({ ...form, energyClass: e.target.value })} /></div>
          <div><Label>Prix d'achat</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} /></div>
          <div><Label>Prix de vente</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
          <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></div>
          <div><Label>Garantie (mois)</Label><Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: +e.target.value })} /></div>
          <div><Label>Emoji</Label><Input className="text-2xl text-center" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></div>
        </div>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================== WARRANTY ================== */
export function WarrantyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    const today = new Date(); const exp = new Date(today); exp.setFullYear(exp.getFullYear() + 2);
    setForm({ productName: "", reference: "", customer: "", phone: "", soldAt: today.toISOString().slice(0, 10), expiresAt: exp.toISOString().slice(0, 10), status: "active", serial: "" });
  }, [open]);
  const submit = () => {
    if (!form.productName || !form.customer) return toast.error("Produit et client requis");
    db.add("warranties", form);
    toast.success("Garantie enregistrée");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle garantie / SAV</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          <div><Label>Produit</Label><Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div><Label>N° série</Label><Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Client</Label><Input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></div>
            <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vendu le</Label><Input type="date" value={form.soldAt} onChange={(e) => setForm({ ...form, soldAt: e.target.value })} /></div>
            <div><Label>Expire le</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
          </div>
          <div><Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expirée</SelectItem><SelectItem value="claim">SAV en cours</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================== RESERVATION ================== */
export function ReservationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { setForm({ customerName: "", phone: "", tableNumber: 1, date: new Date().toISOString().slice(0, 10), time: "19:00", guests: 2, status: "confirmed", note: "" }); }, [open]);
  const submit = () => {
    if (!form.customerName) return toast.error("Nom client requis");
    db.add("reservations", form);
    toast.success("Réservation enregistrée");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle réservation</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nom client *</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Couverts</Label><Input type="number" value={form.guests} onChange={(e) => setForm({ ...form, guests: +e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Heure</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          <div><Label>Table</Label><Input type="number" value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: +e.target.value })} /></div>
          <div><Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">En attente</SelectItem><SelectItem value="confirmed">Confirmée</SelectItem><SelectItem value="seated">Installée</SelectItem><SelectItem value="cancelled">Annulée</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Note</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Anniversaire, allergies…" /></div>
        </div>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
