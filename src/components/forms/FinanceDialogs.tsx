import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/demo-store";
import { EXPENSE_CATEGORIES } from "@/lib/demo-data";
import { toast } from "sonner";

export function ExpenseDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ category:"Loyer", label:"", amount:0, date: new Date().toISOString().slice(0,10), hasReceipt:false, paymentMethod:"cash", recurrent:false, note:""}); },[open]);
  const submit = () => {
    if (!form.label || !form.amount) return toast.error("Libellé et montant requis");
    db.add("expenses", form);
    db.add("cash", { type:"out", label: form.label, amount: form.amount, date: new Date(form.date).toISOString(), source: form.paymentMethod==="cash"?"Caisse principale":form.paymentMethod });
    toast.success("Dépense enregistrée");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        </div>
        <div><Label>Libellé *</Label><Input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Ex: Loyer novembre"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Montant (FCFA) *</Label><Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:+e.target.value})}/></div>
          <div><Label>Moyen de paiement</Label>
            <Select value={form.paymentMethod} onValueChange={v=>setForm({...form,paymentMethod:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="cash">Espèces</SelectItem><SelectItem value="Wave">Wave</SelectItem><SelectItem value="Orange Money">Orange Money</SelectItem><SelectItem value="Virement">Virement</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Justificatif joint</Label><Switch checked={form.hasReceipt} onCheckedChange={v=>setForm({...form,hasReceipt:v})}/></div>
        <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Dépense récurrente (mensuelle)</Label><Switch checked={form.recurrent} onCheckedChange={v=>setForm({...form,recurrent:v})}/></div>
        <div><Label>Note</Label><Textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={2}/></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

export function CashMovementDialog({ open, onOpenChange, type }: { open:boolean; onOpenChange:(v:boolean)=>void; type:"in"|"out"|"transfer" }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ label:"", amount:0, source:"Caisse principale", destination:"Wave", reason:""}); },[open]);
  const submit = () => {
    if (!form.amount) return toast.error("Montant requis");
    if (type==="transfer") {
      db.add("cash", { type:"out", label:`Transfert vers ${form.destination}`, amount: form.amount, date: new Date().toISOString(), source: form.source });
      db.add("cash", { type:"in",  label:`Transfert depuis ${form.source}`,    amount: form.amount, date: new Date().toISOString(), source: form.destination });
    } else {
      db.add("cash", { type, label: form.label||(type==="in"?"Entrée":"Sortie"), amount: form.amount, date: new Date().toISOString(), source: form.source });
    }
    toast.success("Mouvement enregistré");
    onOpenChange(false);
  };
  const title = type==="in"?"Entrée de caisse":type==="out"?"Sortie de caisse":"Virement entre caisses";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4">
        {type !== "transfer" && <div><Label>Libellé</Label><Input value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/></div>}
        <div><Label>Montant *</Label><Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:+e.target.value})}/></div>
        <div><Label>{type==="transfer"?"Depuis":"Caisse"}</Label>
          <Select value={form.source} onValueChange={v=>setForm({...form,source:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="Caisse principale">Caisse principale</SelectItem><SelectItem value="Wave">Wave</SelectItem><SelectItem value="Orange Money">Orange Money</SelectItem><SelectItem value="Banque">Banque</SelectItem></SelectContent>
          </Select>
        </div>
        {type==="transfer" && <div><Label>Vers</Label>
          <Select value={form.destination} onValueChange={v=>setForm({...form,destination:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="Caisse principale">Caisse principale</SelectItem><SelectItem value="Wave">Wave</SelectItem><SelectItem value="Orange Money">Orange Money</SelectItem><SelectItem value="Banque">Banque</SelectItem></SelectContent>
          </Select>
        </div>}
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Valider</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}
