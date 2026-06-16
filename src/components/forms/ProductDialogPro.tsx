import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { db, useCollection, type ProductAttribute } from "@/lib/demo-store";
import { toast } from "sonner";
import { useCreateProduct, useUpdateProduct } from "@/lib/mock-api";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  product?: any;
  onOpenChange: (v: boolean) => void;
}

const UNITS = ["pcs", "paires", "kg", "g", "L", "mL", "boîte", "carton", "sachet"];

export function ProductDialogPro({ open, product, onOpenChange }: Props) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isEdit = !!product;
  const categories = useCollection("categories");

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    setForm(product ?? {
      name: "", sku: "", barcode: "", categoryId: "", category: "", unit: "pcs",
      price: 0, cost: 0, tva: 18, stock: 0, lowStockThreshold: 5,
      supplierId: "", brand: "", description: "", imageEmoji: "📦",
      hasSerial: false, warrantyMonths: 0, attributes: {},
    });
  }, [product, open]);

  const suppliers = db.list("suppliers");
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const margin = form.price > 0 ? (((form.price - form.cost) / form.price) * 100).toFixed(1) : "0";
  const stockValue = (form.cost || 0) * (form.stock || 0);

  const setAttr = (attrId: string, value: any) => {
    setForm({ ...form, attributes: { ...(form.attributes || {}), [attrId]: value } });
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) return toast.error("Nom requis");
    // Validate required dynamic attributes
    if (selectedCategory) {
      for (const a of selectedCategory.attributes) {
        if (a.required) {
          const v = form.attributes?.[a.id];
          if (v === undefined || v === null || v === "") {
            return toast.error(`L'attribut "${a.name}" est obligatoire`);
          }
        }
      }
    }
    // Persist a human-readable category name too for legacy lists
    const payload = { ...form, category: selectedCategory?.name || form.category };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: product.id, data: payload });
        toast.success("Produit mis à jour");
      } else {
        await create.mutateAsync({ data: payload });
        toast.success("Produit créé");
      }
      onOpenChange(false);
    } catch { toast.error("Erreur"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier produit" : "Nouveau produit"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="attributs" className="relative">
              Attributs
              {selectedCategory && selectedCategory.attributes.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/15 text-primary px-1.5 rounded-full">{selectedCategory.attributes.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="price">Prix</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="supplier">Fournisseur</TabsTrigger>
            <TabsTrigger value="advanced">Avancé</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nom du produit *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>SKU / Référence</Label><Input value={form.sku || ""} onChange={e => setForm({...form, sku: e.target.value})} placeholder="TSH-001" /></div>
              <div><Label>Code-barres</Label><Input value={form.barcode || ""} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="6 800 000 000 001" /></div>
              <div className="col-span-2">
                <Label>Catégorie</Label>
                <Select value={form.categoryId || ""} onValueChange={v => setForm({...form, categoryId: v, attributes: {}})}>
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="mr-2">{c.icon}</span>{c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✨ {selectedCategory.attributes.length} attribut(s) personnalisé(s) disponibles dans l'onglet "Attributs"
                  </p>
                )}
              </div>
              <div><Label>Marque</Label><Input value={form.brand || ""} onChange={e => setForm({...form, brand: e.target.value})} /></div>
              <div><Label>Icône / Emoji</Label><Input value={form.imageEmoji || ""} onChange={e => setForm({...form, imageEmoji: e.target.value})} className="text-2xl text-center" /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
            </div>
          </TabsContent>

          <TabsContent value="attributs" className="space-y-4 mt-4">
            {!selectedCategory ? (
              <div className="text-center py-10 border border-dashed rounded-lg">
                <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Sélectionnez d'abord une catégorie dans l'onglet "Général" pour voir ses attributs personnalisés.
                </p>
              </div>
            ) : selectedCategory.attributes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Cette catégorie n'a pas d'attributs personnalisés.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCategory.attributes.map((attr) => (
                  <DynamicAttributeField
                    key={attr.id}
                    attr={attr}
                    value={form.attributes?.[attr.id]}
                    onChange={(v) => setAttr(attr.id, v)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="price" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prix d'achat (FCFA)</Label><Input type="number" value={form.cost || 0} onChange={e => setForm({...form, cost: +e.target.value})} /></div>
              <div><Label>Prix de vente (FCFA)</Label><Input type="number" value={form.price || 0} onChange={e => setForm({...form, price: +e.target.value})} /></div>
              <div><Label>TVA (%)</Label><Input type="number" value={form.tva ?? 18} onChange={e => setForm({...form, tva: +e.target.value})} /></div>
              <div><Label>Marge calculée</Label><div className="h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 rounded-md font-bold text-emerald-700 dark:text-emerald-400">{margin}%</div></div>
              <div className="col-span-2 p-4 bg-muted rounded-lg text-sm">
                <div className="flex justify-between"><span>Bénéfice unitaire</span><strong>{(form.price - form.cost).toLocaleString()} FCFA</strong></div>
                <div className="flex justify-between"><span>Prix TTC</span><strong>{(form.price * (1 + (form.tva || 0)/100)).toLocaleString()} FCFA</strong></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantité en stock</Label><Input type="number" value={form.stock || 0} onChange={e => setForm({...form, stock: +e.target.value})} /></div>
              <div><Label>Unité</Label>
                <Select value={form.unit || "pcs"} onValueChange={v => setForm({...form, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Seuil d'alerte</Label><Input type="number" value={form.lowStockThreshold || 5} onChange={e => setForm({...form, lowStockThreshold: +e.target.value})} /></div>
              <div><Label>Valeur du stock</Label><div className="h-10 flex items-center justify-center bg-primary/10 rounded-md font-bold text-primary">{stockValue.toLocaleString()} FCFA</div></div>
            </div>
          </TabsContent>

          <TabsContent value="supplier" className="space-y-4 mt-4">
            <div><Label>Fournisseur principal</Label>
              <Select value={form.supplierId || ""} onValueChange={v => setForm({...form, supplierId: v})}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.city}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Permet de lancer un réapprovisionnement automatique en cas de rupture.</p>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div><Label>Suivi par numéro de série / IMEI</Label><p className="text-xs text-muted-foreground">Utile pour électronique, téléphones, électroménager</p></div>
              <Switch checked={!!form.hasSerial} onCheckedChange={v => setForm({...form, hasSerial: v})} />
            </div>
            <div><Label>Garantie constructeur (mois)</Label><Input type="number" value={form.warrantyMonths || 0} onChange={e => setForm({...form, warrantyMonths: +e.target.value})} /></div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Enregistrer" : "Créer le produit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Dynamic attribute renderer ----------------

const COLOR_SWATCHES: Record<string, string> = {
  noir: "#111827", blanc: "#f9fafb", bleu: "#2563eb", rouge: "#dc2626",
  vert: "#16a34a", beige: "#d2b48c", or: "#d4af37", argent: "#c0c0c0",
  jaune: "#eab308", rose: "#ec4899", gris: "#6b7280", marron: "#78350f",
};

function DynamicAttributeField({ attr, value, onChange }: { attr: ProductAttribute; value: any; onChange: (v: any) => void }) {
  const label = (
    <Label className="text-sm">
      {attr.name}
      {attr.required && <span className="text-destructive ml-0.5">*</span>}
      {attr.unit && <span className="text-muted-foreground font-normal ml-1">({attr.unit})</span>}
    </Label>
  );

  switch (attr.type) {
    case "text":
      return <div>{label}<Input value={value || ""} onChange={(e) => onChange(e.target.value)} /></div>;
    case "number":
      return <div>{label}<Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : +e.target.value)} /></div>;
    case "date":
      return <div>{label}<Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} /></div>;
    case "checkbox":
      return (
        <div className="flex items-center gap-2 mt-6">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} id={attr.id} />
          <label htmlFor={attr.id} className="text-sm font-medium cursor-pointer">{attr.name}</label>
        </div>
      );
    case "select":
    case "size":
      return (
        <div>{label}
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {(attr.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    case "color":
      return (
        <div className="col-span-1 sm:col-span-2">{label}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {(attr.options || []).map((o) => {
              const swatch = COLOR_SWATCHES[o.toLowerCase()] || "#94a3b8";
              const active = value === o;
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => onChange(o)}
                  className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                    active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: swatch }} />
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    default:
      return null;
  }
}
