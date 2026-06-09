import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer } from "@/lib/mock-api";
import { toast } from "sonner";

export function CustomerDialogPro({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer?: any }) {
  const create = useCreateCustomer();
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    setForm(customer ?? { name: "", phone: "", email: "", type: "particulier", address: "", city: "Dakar", ninea: "", creditLimit: 0, openingBalance: 0, note: "" });
  }, [customer, open]);

  const submit = async () => {
    if (!form.name?.trim()) return toast.error("Nom requis");
    await create.mutateAsync({ data: { name: form.name, phone: form.phone, email: form.email } });
    toast.success("Client ajouté");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3"><TabsTrigger value="info">Identité</TabsTrigger><TabsTrigger value="addr">Adresse</TabsTrigger><TabsTrigger value="biz">Commerce</TabsTrigger></TabsList>
          <TabsContent value="info" className="space-y-4 mt-4 grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Nom complet *</Label><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v=>setForm({...form,type:v})}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="particulier">Particulier</SelectItem><SelectItem value="pro">Professionnel</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Téléphone</Label><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            {form.type === "pro" && <div className="col-span-2"><Label>NINEA / RC</Label><Input value={form.ninea||""} onChange={e=>setForm({...form,ninea:e.target.value})}/></div>}
          </TabsContent>
          <TabsContent value="addr" className="space-y-4 mt-4 grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Adresse</Label><Textarea rows={3} value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></div>
            <div><Label>Ville</Label><Input value={form.city||""} onChange={e=>setForm({...form,city:e.target.value})}/></div>
            <div><Label>Pays</Label><Input defaultValue="Sénégal"/></div>
          </TabsContent>
          <TabsContent value="biz" className="space-y-4 mt-4 grid grid-cols-2 gap-4">
            <div><Label>Plafond de crédit (FCFA)</Label><Input type="number" value={form.creditLimit||0} onChange={e=>setForm({...form,creditLimit:+e.target.value})}/></div>
            <div><Label>Solde initial dû (FCFA)</Label><Input type="number" value={form.openingBalance||0} onChange={e=>setForm({...form,openingBalance:+e.target.value})}/></div>
            <div className="col-span-2"><Label>Note interne</Label><Textarea value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} rows={2}/></div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Ajouter</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
