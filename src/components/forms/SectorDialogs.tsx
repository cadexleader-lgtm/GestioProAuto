import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import {
  createPendingPrivateDocument,
  db,
  getPrivateDocumentUrl,
  privateDocumentSummary,
  uploadPrivateDocument,
  uploadVehiclePhoto,
  uploadVehicleGalleryPhoto,
  uploadVehicleVideo,
  type PendingPrivateDocument,
} from "@/lib/demo-store";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Upload, FileText, Download, Trash2, Plus, Video as VideoIcon, X } from "lucide-react";
import type { Vehicle } from "@/lib/demo-data";
import { VEHICLE_STATUS } from "@/lib/vehicle-status";
import { formatFCFA } from "@/lib/format";

const MAX_GALLERY_PHOTOS = 8;

interface GalleryItem { key: string; url: string; file?: File }

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
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPendingDocs([]);
    setPendingVideo(null);
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
            image: "", photos: [], video: "", notes: "", documents: [],
          },
    );
    const existing = vehicle
      ? [vehicle.image, ...(vehicle.photos ?? [])].filter((u): u is string => !!u)
      : [];
    setGallery(existing.map((url) => ({ key: url, url })));
    setVideoPreview(vehicle?.video ?? "");
  }, [open, vehicle]);

  const total = (form.purchasePrice || 0) + (form.importFees || 0) + (form.customsFees || 0) + (form.repairFees || 0) + (form.maintenanceFees || 0);
  const margin = (form.sellingPrice || 0) - total;
  const marginWholesale = (form.wholesalePrice || 0) - total;
  const marginFloor = (form.minPrice || 0) - total;

  const handleGalleryAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_GALLERY_PHOTOS - gallery.length;
    if (room <= 0) return toast.error(`Maximum ${MAX_GALLERY_PHOTOS} photos par véhicule.`);
    const toAdd = files.slice(0, room);
    if (files.length > toAdd.length) toast.info(`Seules ${toAdd.length} photo(s) ajoutée(s) — limite de ${MAX_GALLERY_PHOTOS} atteinte.`);
    const items: GalleryItem[] = [];
    for (const file of toAdd) {
      if (file.size > 5_000_000) { toast.error(`${file.name} : trop volumineuse (max 5 Mo)`); continue; }
      // Aperçu local immédiat (URL objet, pas de base64) — les fichiers ne
      // sont envoyés au stockage (bucket public vehicle-photos) qu'à la
      // validation du formulaire.
      items.push({ key: crypto.randomUUID(), url: URL.createObjectURL(file), file });
    }
    setGallery((g) => [...g, ...items]);
  };

  const removeGalleryItem = (key: string) => setGallery((g) => g.filter((item) => item.key !== key));

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 50_000_000) return toast.error("Vidéo trop volumineuse (max 50 Mo)");
    setPendingVideo(file);
    setVideoPreview(URL.createObjectURL(file));
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
      toast.error(error instanceof Error ? error.message : "Téléchargement indisponible.");
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

  const submitVehicle = async () => {
    if (!form.brand || !form.model) {
      setStep(0);
      return toast.error("Marque et modèle requis");
    }
    if (submitting) return;

    setSubmitting(true);
    const vehicleId = vehicle?.id ?? form.id ?? crypto.randomUUID();
    const vehicleLabel = `${form.brand} ${form.model}${form.plate ? ` (${form.plate})` : ""}`;

    // Les aperçus posés par handleGalleryAdd()/handleVideoPick() sont des
    // URL objet locales (blob:), invalides hors de cet onglet — jamais
    // persistées telles quelles. On envoie les fichiers réels au stockage
    // et on remplace par les URL publiques avant d'écrire le véhicule.
    // gallery[0] fait toujours office de couverture (form.image) ; le reste
    // (jusqu'à 7 de plus, 8 au total) va dans form.photos.
    const uploadedUrls: string[] = [];
    let mediaFailed = false;
    for (const item of gallery) {
      if (!item.file) { uploadedUrls.push(item.url); continue; }
      try {
        const isCover = uploadedUrls.length === 0;
        const url = isCover
          ? await uploadVehiclePhoto({ vehicleId, file: item.file })
          : await uploadVehicleGalleryPhoto({ vehicleId, file: item.file });
        uploadedUrls.push(url);
      } catch (error) {
        mediaFailed = true;
        console.error("[gestiopro] vehicle photo upload failed", error);
      }
    }
    if (mediaFailed) toast.error("Véhicule enregistré, certaines photos n'ont pas pu être envoyées.");

    let videoUrl = form.video as string;
    if (pendingVideo) {
      try {
        videoUrl = await uploadVehicleVideo({ vehicleId, file: pendingVideo });
      } catch (error) {
        toast.error(error instanceof Error ? `Véhicule enregistré, vidéo non envoyée : ${error.message}` : "Véhicule enregistré, vidéo non envoyée.");
        videoUrl = vehicle?.video || "";
      }
    }

    const cleanForm = {
      ...form,
      id: vehicleId,
      image: uploadedUrls[0] || "",
      photos: uploadedUrls.slice(1),
      video: videoUrl,
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
          toast.error(error instanceof Error ? `Véhicule enregistré, document non archivé : ${error.message}` : "Véhicule enregistré, document non archivé.");
        }
      }

      toast.success(isEdit ? "Véhicule mis à jour" : "Véhicule ajouté");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
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
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
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
            <div className="col-span-2 sm:col-span-3 space-y-3">
              <div>
                <Label>Photos du véhicule ({gallery.length}/{MAX_GALLERY_PHOTOS})</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">La première photo sert de couverture, visible partout dans l'app.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {gallery.map((item, i) => (
                    <div key={item.key} className="relative w-20 h-20 rounded-lg overflow-hidden border shrink-0 group">
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] text-center py-0.5">Couverture</span>}
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(item.key)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {gallery.length < MAX_GALLERY_PHOTOS && (
                    <Label htmlFor="gallery-upload" className="w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition shrink-0">
                      <Plus size={18} />
                      <span className="text-[10px]">Ajouter</span>
                      <input id="gallery-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryAdd} />
                    </Label>
                  )}
                </div>
              </div>

              <div>
                <Label>Vidéo de présentation (optionnelle)</Label>
                {videoPreview ? (
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="w-20 h-14 rounded-lg overflow-hidden border bg-slate-900 shrink-0">
                      <video src={videoPreview} className="w-full h-full object-cover" />
                    </div>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => { setPendingVideo(null); setVideoPreview(""); setForm({ ...form, video: "" }); }}>
                      <Trash2 size={14} /> Retirer
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="video-upload" className="mt-1.5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition w-fit">
                    <VideoIcon size={16} /> Ajouter une vidéo (max 50 Mo)
                    <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoPick} />
                  </Label>
                )}
              </div>
            </div>
            <div><Label>Marque *</Label><Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Modèle *</Label><Input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Année</Label><Input type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: +e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} /></div>
            <div><Label>Couleur</Label><Input value={form.color || ""} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div><Label>Plaque</Label><Input value={form.plate || ""} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
            <div className="col-span-2 sm:col-span-3"><Label>VIN / N° châssis</Label><Input value={form.vin || ""} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></div>
            {isEdit && form.status && (
              <div>
                <Label>Statut</Label>
                <div className="h-10 flex items-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${VEHICLE_STATUS[form.status as Vehicle["status"]].badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${VEHICLE_STATUS[form.status as Vehicle["status"]].dotCls}`} />
                    {VEHICLE_STATUS[form.status as Vehicle["status"]].label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Change automatiquement via Vendre / Louer / Maintenance.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — Technique */}
        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><Label>Kilométrage</Label><Input type="number" value={form.mileageKm || 0} onChange={(e) => setForm({ ...form, mileageKm: +e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} /></div>
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
            <div><Label>Prix d'achat</Label><MoneyInput value={form.purchasePrice} onChange={(v) => setForm({ ...form, purchasePrice: v })} /></div>
            <div><Label>Frais import</Label><MoneyInput value={form.importFees} onChange={(v) => setForm({ ...form, importFees: v })} /></div>
            <div><Label>Douane</Label><MoneyInput value={form.customsFees} onChange={(v) => setForm({ ...form, customsFees: v })} /></div>
            <div><Label>Réparations</Label><MoneyInput value={form.repairFees} onChange={(v) => setForm({ ...form, repairFees: v })} /></div>
            <div><Label>Entretien</Label><MoneyInput value={form.maintenanceFees} onChange={(v) => setForm({ ...form, maintenanceFees: v })} /></div>
            <div><Label>Prix affiché (public)</Label><MoneyInput value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} /></div>
            <div><Label>Prix marchand (gros)</Label><MoneyInput value={form.wholesalePrice} onChange={(v) => setForm({ ...form, wholesalePrice: v })} /></div>
            <div><Label>Prix plancher (min négociation)</Label><MoneyInput value={form.minPrice} onChange={(v) => setForm({ ...form, minPrice: v })} /></div>
            <div className="col-span-2 p-3 bg-muted rounded-lg flex justify-between"><span>Coût de revient total</span><strong>{formatFCFA(total)}</strong></div>
            {([
              ["Marge prix affiché", margin],
              ["Marge prix marchand", marginWholesale],
              ["Marge prix plancher", marginFloor],
            ] as [string, number][]).map(([label, m]) => (
              <div key={label} className={`col-span-2 p-3 rounded-lg flex justify-between ${m < 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
                <span>{label}</span>
                <strong className={m < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
                  {formatFCFA(m)} {m < 0 && "⚠️ Marge négative"}
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
