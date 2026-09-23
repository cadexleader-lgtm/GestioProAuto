import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createPendingPrivateDocument,
  db,
  getPrivateDocumentUrl,
  privateDocumentSummary,
  uploadPrivateDocument,
  uploadVehiclePhoto,
  type PendingPrivateDocument,
} from "@/lib/demo-store";
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
  const [pendingDocs, setPendingDocs] = useState<PendingPrivateDocument[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPendingDocs([]);
    setPendingPhoto(null);
    setSubmitting(false);
    setForm(
      vehicle
        ? { ...vehicle, documents: vehicle.documents || [] }
        : {
            id: crypto.randomUUID(),
            brand: "", model: "", year: new Date().getFullYear(), color: "Blanc",
            vin: "", plate: "", mileageKm: 0, fuel: "Essence", transmission: "Manuelle",
            purchasePrice: 0, importFees: 0, customsFees: 0, repairFees: 0, maintenanceFees: 0,
            sellingPrice: 0, minPrice: 0, wholesalePrice: 0, status: "available", photo: "🚗",
            insuranceExpiry: "", techControlExpiry: "", carteGrise: "",
            image: "", notes: "", documents: [],
          },
    );
  }, [open, vehicle]);

  const total = (form.purchasePrice || 0) + (form.importFees || 0) + (form.customsFees || 0) + (form.repairFees || 0) + (form.maintenanceFees || 0);
  const margin = (form.sellingPrice || 0) - total;
  const marginWholesale = (form.wholesalePrice || 0) - total;
  const marginFloor = (form.minPrice || 0) - total;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) return toast.error("Image trop volumineuse (max 2.5 Mo)");
    // Aperçu local immédiat (URL objet, pas de base64) — le fichier n'est
    // envoyé au stockage (bucket public vehicle-photos) qu'à la validation
    // du formulaire.
    setPendingPhoto(file);
    setForm((f: any) => ({ ...f, image: URL.createObjectURL(file) }));
  };

  const handleDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 5_000_000) {
        toast.error(`${file.name} : trop volumineux (max 5 Mo)`);
        return;
      }
      setPendingDocs((items) => [...items, createPendingPrivateDocument(file)]);
    });
    e.target.value = "";
  };

  const removeDoc = (id: string) =>
    setForm((f: any) => ({ ...f, documents: f.documents.filter((d: any) => d.id !== id) }));

  const downloadDoc = async (d: any) => {
    try {
      const a = document.createElement("a");
      a.href = await getPrivateDocumentUrl(d);
      a.download = d.name;
      a.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "TÃ©lÃ©chargement indisponible.");
    }
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

  const submitVehicle = async () => {
    if (!form.brand || !form.model) {
      setStep(0);
      return toast.error("Marque et modÃ¨le requis");
    }
    if (submitting) return;

    setSubmitting(true);
    const vehicleId = vehicle?.id ?? form.id ?? crypto.randomUUID();
    const vehicleLabel = `${form.brand} ${form.model}${form.plate ? ` (${form.plate})` : ""}`;

    // L'aperçu posé par handleImage() est une URL objet locale (blob:),
    // invalide hors de cet onglet — jamais persistée telle quelle. On
    // envoie le fichier réel au stockage et on remplace par l'URL publique
    // avant d'écrire le véhicule.
    let imageUrl = form.image as string;
    if (pendingPhoto) {
      try {
        imageUrl = await uploadVehiclePhoto({ vehicleId, file: pendingPhoto });
      } catch (error) {
        toast.error(error instanceof Error ? `Véhicule enregistré, photo non envoyée : ${error.message}` : "Véhicule enregistré, photo non envoyée.");
        imageUrl = vehicle?.image || "";
      }
    }

    const cleanForm = {
      ...form,
      id: vehicleId,
      image: imageUrl,
      documents: (form.documents || []).filter((d: any) => d.dataUrl),
    };

    try {
      if (isEdit && vehicle) {
        db.update("vehicles", vehicle.id, cleanForm);
      } else {
        db.add("vehicles", cleanForm);
      }

      if (pendingDocs.length > 0) {
        try {
          await Promise.all(pendingDocs.map((doc) => uploadPrivateDocument({
            file: doc.file,
            documentId: doc.id,
            type: "piece",
            title: doc.name,
            reference: doc.name,
            relatedTo: form.plate,
            entityType: "vehicle",
            entityId: vehicleId,
            entityLabel: vehicleLabel,
            relationType: "vehicle_attachment",
            expiresAt: form.insuranceExpiry || form.techControlExpiry || undefined,
            metadata: {
              vehicleId,
              vehiclePlate: form.plate,
              source: "vehicle_dialog",
              summary: privateDocumentSummary(doc),
            },
          })));
          setPendingDocs([]);
        } catch (error) {
          toast.error(error instanceof Error ? `VÃ©hicule enregistrÃ©, document non archivÃ© : ${error.message}` : "VÃ©hicule enregistrÃ©, document non archivÃ©.");
        }
      }

      toast.success(isEdit ? "VÃ©hicule mis Ã  jour" : "VÃ©hicule ajoutÃ©");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };
  void submit;

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
                {form.image && (
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => { setPendingPhoto(null); setForm({ ...form, image: "" }); }}>
                    Retirer
                  </Button>
                )}
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
            <div><Label>Prix affiché (public)</Label><Input type="number" value={form.sellingPrice || 0} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} /></div>
            <div><Label>Prix marchand (gros)</Label><Input type="number" value={form.wholesalePrice || 0} onChange={(e) => setForm({ ...form, wholesalePrice: +e.target.value })} /></div>
            <div><Label>Prix plancher (min négociation)</Label><Input type="number" value={form.minPrice || 0} onChange={(e) => setForm({ ...form, minPrice: +e.target.value })} /></div>
            <div className="col-span-2 p-3 bg-muted rounded-lg flex justify-between"><span>Coût de revient total</span><strong>{total.toLocaleString()} FCFA</strong></div>
            {([
              ["Marge prix affiché", margin],
              ["Marge prix marchand", marginWholesale],
              ["Marge prix plancher", marginFloor],
            ] as [string, number][]).map(([label, m]) => (
              <div key={label} className={`col-span-2 p-3 rounded-lg flex justify-between ${m < 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
                <span>{label}</span>
                <strong className={m < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
                  {m.toLocaleString()} FCFA {m < 0 && "⚠️ Marge négative"}
                </strong>
              </div>
            ))}
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

            {(form.documents?.length || 0) === 0 && pendingDocs.length === 0 ? (
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
                {pendingDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white/60 dark:bg-slate-900/40">
                    <FileText size={18} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(d.size / 1024).toFixed(0)} Ko · En attente d'archivage privé</p>
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setPendingDocs((items) => items.filter((item) => item.id !== d.id))}><Trash2 size={14} className="text-rose-600" /></Button>
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
              <Button onClick={submitVehicle} disabled={submitting}><Check size={14} /> {isEdit ? "Enregistrer les modifications" : "Créer le véhicule"}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
