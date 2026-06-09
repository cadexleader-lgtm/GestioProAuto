import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/demo-store";
import { toast } from "sonner";

export function SupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ name:"", company:"", contact:"", phone:"", email:"", city:"Dakar", country:"Sénégal", rc:"", ninea:"", paymentTerms:"30j", deliveryDays:7, totalPurchases:0, outstandingDebt:0, ordersInProgress:0, note:""}); },[open]);
  const submit = () => {
    if (!form.name?.trim()) return toast.error("Nom requis");
    db.add("suppliers", form);
    toast.success("Fournisseur ajouté");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
        <Tabs defaultValue="info"><TabsList className="grid grid-cols-3"><TabsTrigger value="info">Identité</TabsTrigger><TabsTrigger value="contact">Contact</TabsTrigger><TabsTrigger value="terms">Conditions</TabsTrigger></TabsList>
          <TabsContent value="info" className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2"><Label>Nom commercial *</Label><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="col-span-2"><Label>Raison sociale</Label><Input value={form.company||""} onChange={e=>setForm({...form,company:e.target.value})}/></div>
            <div><Label>RC</Label><Input value={form.rc||""} onChange={e=>setForm({...form,rc:e.target.value})}/></div>
            <div><Label>NINEA</Label><Input value={form.ninea||""} onChange={e=>setForm({...form,ninea:e.target.value})}/></div>
          </TabsContent>
          <TabsContent value="contact" className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2"><Label>Personne contact</Label><Input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
            <div><Label>Téléphone</Label><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div><Label>Email</Label><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><Label>Ville</Label><Input value={form.city||""} onChange={e=>setForm({...form,city:e.target.value})}/></div>
            <div><Label>Pays</Label><Input value={form.country||""} onChange={e=>setForm({...form,country:e.target.value})}/></div>
          </TabsContent>
          <TabsContent value="terms" className="grid grid-cols-2 gap-4 mt-4">
            <div><Label>Délai de paiement</Label>
              <Select value={form.paymentTerms} onValueChange={v=>setForm({...form,paymentTerms:v})}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="comptant">Comptant</SelectItem><SelectItem value="15j">15 jours</SelectItem><SelectItem value="30j">30 jours</SelectItem><SelectItem value="60j">60 jours</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Délai livraison (jours)</Label><Input type="number" value={form.deliveryDays||7} onChange={e=>setForm({...form,deliveryDays:+e.target.value})}/></div>
            <div className="col-span-2"><Label>Note</Label><Textarea value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
