import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/demo-store";
import { toast } from "sonner";

export function VehicleDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ brand:"", model:"", year:new Date().getFullYear(), color:"Blanc", vin:"", plate:"", mileageKm:0, fuel:"Essence", transmission:"Manuelle", purchasePrice:0, importFees:0, customsFees:0, repairFees:0, maintenanceFees:0, sellingPrice:0, status:"available", photo:"🚗", insuranceExpiry:"", techControlExpiry:"", carteGrise:"", image:"", notes:"" }); },[open]);
  const total = (form.purchasePrice||0)+(form.importFees||0)+(form.customsFees||0)+(form.repairFees||0)+(form.maintenanceFees||0);
  const margin = (form.sellingPrice||0)-total;
  const submit = () => {
    if (!form.brand || !form.model) return toast.error("Marque et modèle requis");
    db.add("vehicles", form);
    toast.success("Véhicule ajouté");
    onOpenChange(false);
  };
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) { toast.error("Image trop volumineuse (max 2.5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f: any) => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nouveau véhicule</DialogTitle></DialogHeader>
      <Tabs defaultValue="g"><TabsList className="grid grid-cols-4"><TabsTrigger value="g">Général</TabsTrigger><TabsTrigger value="t">Technique</TabsTrigger><TabsTrigger value="f">Finances</TabsTrigger><TabsTrigger value="d">Documents</TabsTrigger></TabsList>
        <TabsContent value="g" className="grid grid-cols-3 gap-3 mt-4">
          <div className="col-span-3">
            <Label>Photo du véhicule</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-3xl shrink-0">
                {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : form.photo}
              </div>
              <Input type="file" accept="image/*" onChange={handleImage} />
              {form.image && <Button type="button" variant="outline" size="sm" onClick={()=>setForm({...form, image:""})}>Retirer</Button>}
            </div>
          </div>
          <div><Label>Marque *</Label><Input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
          <div><Label>Modèle *</Label><Input value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
          <div><Label>Année</Label><Input type="number" value={form.year} onChange={e=>setForm({...form,year:+e.target.value})}/></div>
          <div><Label>Couleur</Label><Input value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div>
          <div><Label>Plaque</Label><Input value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})}/></div>
          <div><Label>VIN / N° châssis</Label><Input value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})}/></div>
          <div><Label>Statut</Label>
            <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="available">Disponible</SelectItem><SelectItem value="sold">Vendu</SelectItem><SelectItem value="rented">Loué</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Emoji (fallback)</Label><Input className="text-2xl text-center" value={form.photo} onChange={e=>setForm({...form,photo:e.target.value})}/></div>
        </TabsContent>
        <TabsContent value="t" className="grid grid-cols-3 gap-3 mt-4">
          <div><Label>Kilométrage</Label><Input type="number" value={form.mileageKm} onChange={e=>setForm({...form,mileageKm:+e.target.value})}/></div>
          <div><Label>Carburant</Label>
            <Select value={form.fuel} onValueChange={v=>setForm({...form,fuel:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="Essence">Essence</SelectItem><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Hybride">Hybride</SelectItem><SelectItem value="Électrique">Électrique</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Transmission</Label>
            <Select value={form.transmission} onValueChange={v=>setForm({...form,transmission:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="Manuelle">Manuelle</SelectItem><SelectItem value="Automatique">Automatique</SelectItem></SelectContent>
            </Select>
          </div>
        </TabsContent>
        <TabsContent value="f" className="grid grid-cols-2 gap-3 mt-4">
          <div><Label>Prix d'achat</Label><Input type="number" value={form.purchasePrice} onChange={e=>setForm({...form,purchasePrice:+e.target.value})}/></div>
          <div><Label>Frais import</Label><Input type="number" value={form.importFees} onChange={e=>setForm({...form,importFees:+e.target.value})}/></div>
          <div><Label>Douane</Label><Input type="number" value={form.customsFees} onChange={e=>setForm({...form,customsFees:+e.target.value})}/></div>
          <div><Label>Réparations</Label><Input type="number" value={form.repairFees} onChange={e=>setForm({...form,repairFees:+e.target.value})}/></div>
          <div><Label>Entretien</Label><Input type="number" value={form.maintenanceFees} onChange={e=>setForm({...form,maintenanceFees:+e.target.value})}/></div>
          <div><Label>Prix de vente</Label><Input type="number" value={form.sellingPrice} onChange={e=>setForm({...form,sellingPrice:+e.target.value})}/></div>
          <div className="col-span-2 p-3 bg-muted rounded-lg flex justify-between"><span>Coût total</span><strong>{total.toLocaleString()} FCFA</strong></div>
          <div className="col-span-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex justify-between"><span>Marge prévue</span><strong className="text-emerald-700 dark:text-emerald-400">{margin.toLocaleString()} FCFA</strong></div>
        </TabsContent>
        <TabsContent value="d" className="grid grid-cols-2 gap-3 mt-4">
          <div><Label>N° Carte grise</Label><Input value={form.carteGrise} onChange={e=>setForm({...form,carteGrise:e.target.value})}/></div>
          <div><Label>Expiration assurance</Label><Input type="date" value={form.insuranceExpiry} onChange={e=>setForm({...form,insuranceExpiry:e.target.value})}/></div>
          <div><Label>Expiration visite technique</Label><Input type="date" value={form.techControlExpiry} onChange={e=>setForm({...form,techControlExpiry:e.target.value})}/></div>
        </TabsContent>
      </Tabs>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

export function ApplianceDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ name:"", category:"Réfrigérateur", brand:"", reference:"", price:0, cost:0, stock:0, warrantyMonths:24, emoji:"🧊", energyClass:"A++", trackBySerial:true }); },[open]);
  const submit = () => {
    if (!form.name) return toast.error("Nom requis");
    db.add("appliances", form);
    toast.success("Produit ajouté");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Nouvel appareil électroménager</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="col-span-2"><Label>Nom *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><Label>Catégorie</Label>
          <Select value={form.category} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{["Réfrigérateur","Téléviseur","Climatiseur","Congélateur","Machine à laver","Cuisinière","Ventilateur","Micro-ondes"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Marque</Label>
          <Select value={form.brand} onValueChange={v=>setForm({...form,brand:v})}><SelectTrigger><SelectValue placeholder="Choisir"/></SelectTrigger>
            <SelectContent>{["Samsung","LG","Hisense","Haier","Beko","Brandt","Sharp","Whirlpool","Sony","TCL"].map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Référence</Label><Input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></div>
        <div><Label>Classe énergétique</Label><Input value={form.energyClass} onChange={e=>setForm({...form,energyClass:e.target.value})}/></div>
        <div><Label>Prix d'achat</Label><Input type="number" value={form.cost} onChange={e=>setForm({...form,cost:+e.target.value})}/></div>
        <div><Label>Prix de vente</Label><Input type="number" value={form.price} onChange={e=>setForm({...form,price:+e.target.value})}/></div>
        <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={e=>setForm({...form,stock:+e.target.value})}/></div>
        <div><Label>Garantie (mois)</Label><Input type="number" value={form.warrantyMonths} onChange={e=>setForm({...form,warrantyMonths:+e.target.value})}/></div>
        <div><Label>Emoji</Label><Input className="text-2xl text-center" value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

export function WarrantyDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ const today = new Date(); const exp = new Date(today); exp.setFullYear(exp.getFullYear()+2);
    setForm({ productName:"", reference:"", customer:"", phone:"", soldAt: today.toISOString().slice(0,10), expiresAt: exp.toISOString().slice(0,10), status:"active", serial:"" }); },[open]);
  const submit = () => {
    if (!form.productName || !form.customer) return toast.error("Produit et client requis");
    db.add("warranties", form);
    toast.success("Garantie enregistrée");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nouvelle garantie / SAV</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4">
        <div><Label>Produit</Label><Input value={form.productName} onChange={e=>setForm({...form,productName:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Référence</Label><Input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></div>
          <div><Label>N° série</Label><Input value={form.serial} onChange={e=>setForm({...form,serial:e.target.value})}/></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Client</Label><Input value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})}/></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Vendu le</Label><Input type="date" value={form.soldAt} onChange={e=>setForm({...form,soldAt:e.target.value})}/></div>
          <div><Label>Expire le</Label><Input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></div>
        </div>
        <div><Label>Statut</Label>
          <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expirée</SelectItem><SelectItem value="claim">SAV en cours</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

export function ReservationDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ customerName:"", phone:"", tableNumber:1, date: new Date().toISOString().slice(0,10), time:"19:00", guests:2, status:"confirmed", note:"" }); },[open]);
  const submit = () => {
    if (!form.customerName) return toast.error("Nom client requis");
    db.add("reservations", form);
    toast.success("Réservation enregistrée");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nouvelle réservation</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nom client *</Label><Input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></div>
        <div><Label>Téléphone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><Label>Couverts</Label><Input type="number" value={form.guests} onChange={e=>setForm({...form,guests:+e.target.value})}/></div>
        <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div><Label>Heure</Label><Input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div>
        <div><Label>Table</Label><Input type="number" value={form.tableNumber} onChange={e=>setForm({...form,tableNumber:+e.target.value})}/></div>
        <div><Label>Statut</Label>
          <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="pending">En attente</SelectItem><SelectItem value="confirmed">Confirmée</SelectItem><SelectItem value="seated">Installée</SelectItem><SelectItem value="cancelled">Annulée</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Note</Label><Input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Anniversaire, allergies…"/></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}
