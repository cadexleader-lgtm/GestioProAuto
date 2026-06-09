import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, db } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS: Record<string, { label: string; cls: string }> = {
  active:   { label: "En cours",  cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  returned: { label: "Retourné",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  overdue:  { label: "En retard", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function VehiculesLocations() {
  const rentals = useCollection("rentals");
  const vehicles = useCollection("vehicles");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const openNew = () => {
    setForm({ vehicleId: vehicles.find(v=>v.status==="available")?.id || vehicles[0]?.id, customer:"", startDate:new Date().toISOString().slice(0,10), endDate:new Date(Date.now()+7*86400000).toISOString().slice(0,10), dailyRate:35000, deposit:200000, status:"active" });
    setOpen(true);
  };
  const submit = () => {
    if (!form.customer) return toast.error("Client requis");
    db.add("rentals", form);
    toast.success("Contrat de location créé");
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground mt-1">Contrats actifs, dépôts de garantie et historique.</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Nouveau contrat</Button>
      </div>

      <div className="grid gap-4">
        {rentals.map(r => {
          const v = vehicles.find(x => x.id === r.vehicleId);
          if (!v) return null;
          const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / (1000*60*60*24)));
          const total = days * r.dailyRate;
          const st = STATUS[r.status];
          return (
            <Card key={r.id} className="shadow-sm">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="text-4xl">{v.photo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1"><KeyRound size={12} className="inline mr-1" /> {r.customer}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Du {new Date(r.startDate).toLocaleDateString("fr-FR")} au {new Date(r.endDate).toLocaleDateString("fr-FR")} · <strong>{days}</strong> jours
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Tarif</p><p className="font-semibold">{formatFCFA(r.dailyRate)}/j</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Dépôt</p><p className="font-semibold">{formatFCFA(r.deposit)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p><p className="font-bold text-primary">{formatFCFA(total)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau contrat de location</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Véhicule</Label>
              <Select value={form.vehicleId} onValueChange={v=>setForm({...form,vehicleId:v})}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{vehicles.map(v=><SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Client *</Label><Input value={form.customer||""} onChange={e=>setForm({...form,customer:e.target.value})}/></div>
            <div><Label>Du</Label><Input type="date" value={form.startDate||""} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
            <div><Label>Au</Label><Input type="date" value={form.endDate||""} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
            <div><Label>Tarif / jour</Label><Input type="number" value={form.dailyRate||0} onChange={e=>setForm({...form,dailyRate:+e.target.value})}/></div>
            <div><Label>Dépôt de garantie</Label><Input type="number" value={form.deposit||0} onChange={e=>setForm({...form,deposit:+e.target.value})}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setOpen(false)}>Annuler</Button><Button onClick={submit}>Créer le contrat</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
