import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/demo-store";
import { toast } from "sonner";
import { useCreateProduct, useUpdateProduct } from "@/lib/mock-api";

interface Props {
  open: boolean;
  product?: any;
  onOpenChange: (v: boolean) => void;
}

const UNITS = ["pcs", "paires", "kg", "g", "L", "mL", "boîte", "carton", "sachet"];
const CATEGORIES = ["Vêtements", "Chaussures", "Accessoires", "Électronique", "Alimentation", "Beauté", "Maison", "Autres"];

export function ProductDialogPro({ open, product, onOpenChange }: Props) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isEdit = !!product;

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    setForm(product ?? {
      name: "", sku: "", barcode: "", category: "", unit: "pcs",
      price: 0, cost: 0, tva: 18, stock: 0, lowStockThreshold: 5,
      supplierId: "", brand: "", description: "", imageEmoji: "📦",
      hasSerial: false, warrantyMonths: 0,
    });
  }, [product, open]);

  const suppliers = db.list("suppliers");
  const margin = form.price > 0 ? (((form.price - form.cost) / form.price) * 100).toFixed(1) : "0";
  const stockValue = (form.cost || 0) * (form.stock || 0);

  const handleSubmit = async () => {
    if (!form.name?.trim()) return toast.error("Nom requis");
    try {
      if (isEdit) {
        await update.mutateAsync({ id: product.id, data: form });
        toast.success("Produit mis à jour");
      } else {
        await create.mutateAsync({ data: form });
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
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="price">Prix & TVA</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="supplier">Fournisseur</TabsTrigger>
            <TabsTrigger value="advanced">Avancé</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nom du produit *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>SKU / Référence</Label><Input value={form.sku || ""} onChange={e => setForm({...form, sku: e.target.value})} placeholder="TSH-001" /></div>
              <div><Label>Code-barres</Label><Input value={form.barcode || ""} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="6 800 000 000 001" /></div>
              <div><Label>Catégorie</Label>
                <Select value={form.category || ""} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Marque</Label><Input value={form.brand || ""} onChange={e => setForm({...form, brand: e.target.value})} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
              <div><Label>Icône / Emoji</Label><Input value={form.imageEmoji || ""} onChange={e => setForm({...form, imageEmoji: e.target.value})} className="text-2xl text-center" /></div>
            </div>
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
