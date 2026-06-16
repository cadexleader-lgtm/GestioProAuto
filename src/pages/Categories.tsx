import { useState } from "react";
import { useCollection, db, type Category, type ProductAttribute, type AttributeType } from "@/lib/demo-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Tags, Edit2, Trash2, GripVertical, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ATTR_TYPES: { value: AttributeType; label: string; hint: string }[] = [
  { value: "text", label: "Texte libre", hint: "IMEI, marque, référence…" },
  { value: "number", label: "Nombre", hint: "Puissance, poids…" },
  { value: "date", label: "Date", hint: "Péremption, garantie…" },
  { value: "select", label: "Liste déroulante", hint: "Liste de choix" },
  { value: "color", label: "Couleur", hint: "Palette + nom" },
  { value: "size", label: "Taille", hint: "XS, S, M, L, XL…" },
  { value: "checkbox", label: "Case à cocher", hint: "Oui / Non" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

export function Categories() {
  const categories = useCollection("categories");
  const [dialog, setDialog] = useState<{ open: boolean; category?: Category }>({ open: false });

  const handleDelete = (cat: Category) => {
    if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
      db.remove("categories", cat.id);
      toast.success("Catégorie supprimée");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight truncate">Catégories & Attributs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Le moteur dynamique : créez vos catégories et vos propres attributs.</p>
        </div>
        <Button onClick={() => setDialog({ open: true })} className="gap-2 shrink-0 shadow-md">
          <Plus size={18} /> Nouvelle catégorie
        </Button>
      </header>

      <Card className="bg-gradient-to-br from-primary/5 via-primary/0 to-transparent border-primary/20">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
            <Sparkles className="text-primary" size={20} />
          </div>
          <div className="min-w-0 text-sm">
            <p className="font-semibold">Une seule plateforme, tous vos commerces.</p>
            <p className="text-muted-foreground mt-0.5">
              Vêtements, téléphones, cosmétique, quincaillerie, informatique, supermarché…
              Définissez ici les attributs propres à chaque type de produit (IMEI, taille, contenance, puissance…) et ils apparaîtront automatiquement dans la fiche produit.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Tags className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Aucune catégorie. Créez votre première catégorie pour commencer.</p>
            </CardContent>
          </Card>
        )}
        {categories.map((cat) => (
          <Card key={cat.id} className="group hover:shadow-lg transition-all hover:border-primary/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-2xl grid place-items-center shrink-0">
                    {cat.icon || "📦"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{cat.name}</h3>
                    {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setDialog({ open: true, category: cat })} className="p-2 hover:bg-primary/10 text-primary rounded-lg"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(cat)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat.attributes.length} attribut{cat.attributes.length > 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.attributes.slice(0, 6).map((a) => (
                    <Badge key={a.id} variant="secondary" className="font-normal">
                      {a.name}
                      {a.required && <span className="text-destructive ml-0.5">*</span>}
                    </Badge>
                  ))}
                  {cat.attributes.length > 6 && (
                    <Badge variant="outline" className="font-normal">+{cat.attributes.length - 6}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CategoryDialog
        open={dialog.open}
        category={dialog.category}
        onOpenChange={(open) => setDialog({ open, category: undefined })}
      />
    </div>
  );
}

// ---------------- Dialog ----------------

interface DialogProps {
  open: boolean;
  category?: Category;
  onOpenChange: (open: boolean) => void;
}

function CategoryDialog({ open, category, onOpenChange }: DialogProps) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "📦");
  const [description, setDescription] = useState(category?.description || "");
  const [attrs, setAttrs] = useState<ProductAttribute[]>(category?.attributes || []);

  // Reset on open
  useState(() => {
    if (open) {
      setName(category?.name || "");
      setIcon(category?.icon || "📦");
      setDescription(category?.description || "");
      setAttrs(category?.attributes || []);
    }
  });

  const addAttr = () => {
    setAttrs((a) => [...a, { id: uid(), name: "", type: "text" }]);
  };
  const updateAttr = (id: string, patch: Partial<ProductAttribute>) => {
    setAttrs((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const removeAttr = (id: string) => setAttrs((a) => a.filter((x) => x.id !== id));

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Nom de catégorie requis");
    if (attrs.some((a) => !a.name.trim())) return toast.error("Chaque attribut doit avoir un nom");

    const payload: Omit<Category, "id"> = {
      name: name.trim(),
      icon: icon.trim() || "📦",
      description: description.trim(),
      attributes: attrs,
      createdAt: category?.createdAt || new Date().toISOString(),
    };

    if (isEdit && category) {
      db.update("categories", category.id, payload);
      toast.success("Catégorie mise à jour");
    } else {
      db.add("categories", payload);
      toast.success("Catégorie créée");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <Label>Icône</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-2xl text-center h-10" maxLength={2} />
            </div>
            <div>
              <Label>Nom de la catégorie *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vêtements, Smartphones, Parfums…" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="À quoi sert cette catégorie ?" />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Attributs personnalisés</Label>
                <p className="text-xs text-muted-foreground">Champs que vos vendeurs rempliront pour chaque produit de cette catégorie.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addAttr} className="gap-1.5 shrink-0">
                <Plus size={14} /> Ajouter
              </Button>
            </div>

            {attrs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                Aucun attribut. Cliquez sur "Ajouter" pour créer un champ personnalisé.
              </div>
            ) : (
              <div className="space-y-2">
                {attrs.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[20px_1fr_180px_auto] items-center gap-2">
                      <GripVertical size={16} className="text-muted-foreground hidden sm:block" />
                      <Input
                        value={a.name}
                        onChange={(e) => updateAttr(a.id, { name: e.target.value })}
                        placeholder="Nom (ex: Taille, IMEI, Puissance…)"
                      />
                      <Select value={a.type} onValueChange={(v: AttributeType) => updateAttr(a.id, { type: v, options: ["select", "color", "size"].includes(v) ? (a.options ?? []) : undefined })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ATTR_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex flex-col">
                                <span>{t.label}</span>
                                <span className="text-[10px] text-muted-foreground">{t.hint}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => removeAttr(a.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-md">
                        <X size={16} />
                      </button>
                    </div>
                    {(a.type === "select" || a.type === "color" || a.type === "size") && (
                      <Input
                        value={(a.options || []).join(", ")}
                        onChange={(e) => updateAttr(a.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        placeholder="Valeurs séparées par des virgules (ex: S, M, L, XL)"
                        className="text-sm"
                      />
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={!!a.required} onCheckedChange={(v) => updateAttr(a.id, { required: v })} />
                        <span>Obligatoire</span>
                      </label>
                      {(a.type === "number" || a.type === "text") && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Unité :</span>
                          <Input
                            value={a.unit || ""}
                            onChange={(e) => updateAttr(a.id, { unit: e.target.value })}
                            placeholder="kg, W, mois…"
                            className="h-7 w-24 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Enregistrer" : "Créer la catégorie"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
