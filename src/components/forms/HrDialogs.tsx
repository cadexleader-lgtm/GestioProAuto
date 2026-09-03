import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, addExpense, archiveDocument } from "@/lib/demo-store";
import { toast } from "sonner";

const DEPTS = ["Direction","Ventes","Caisse","Stock","Finance","Logistique","RH","Cuisine","Service","Technique"];

export function EmployeeDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ firstName:"", lastName:"", position:"", department:"Ventes", phone:"", email:"", hiredAt:new Date().toISOString().slice(0,10), salary:150000, status:"present", contractType:"CDI", idCard:"", bankAccount:"", address:""}); },[open]);
  const submit = () => {
    if (!form.firstName || !form.lastName) return toast.error("Nom requis");
    db.add("employees", form);
    toast.success("Employé ajouté");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
        <Tabs defaultValue="info"><TabsList className="grid grid-cols-3"><TabsTrigger value="info">Identité</TabsTrigger><TabsTrigger value="job">Poste</TabsTrigger><TabsTrigger value="pay">Rémunération</TabsTrigger></TabsList>
          <TabsContent value="info" className="grid grid-cols-2 gap-4 mt-4">
            <div><Label>Prénom *</Label><Input value={form.firstName||""} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
            <div><Label>Nom *</Label><Input value={form.lastName||""} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
            <div><Label>Téléphone</Label><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div><Label>Email</Label><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div className="col-span-2"><Label>N° CNI</Label><Input value={form.idCard||""} onChange={e=>setForm({...form,idCard:e.target.value})}/></div>
            <div className="col-span-2"><Label>Adresse</Label><Input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></div>
          </TabsContent>
          <TabsContent value="job" className="grid grid-cols-2 gap-4 mt-4">
            <div><Label>Poste</Label><Input value={form.position||""} onChange={e=>setForm({...form,position:e.target.value})}/></div>
            <div><Label>Département</Label>
              <Select value={form.department} onValueChange={v=>setForm({...form,department:v})}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{DEPTS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date d'embauche</Label><Input type="date" value={form.hiredAt||""} onChange={e=>setForm({...form,hiredAt:e.target.value})}/></div>
            <div><Label>Type contrat</Label>
              <Select value={form.contractType} onValueChange={v=>setForm({...form,contractType:v})}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="CDI">CDI</SelectItem><SelectItem value="CDD">CDD</SelectItem><SelectItem value="Stage">Stage</SelectItem><SelectItem value="Freelance">Freelance</SelectItem></SelectContent>
              </Select>
            </div>
          </TabsContent>
          <TabsContent value="pay" className="grid grid-cols-2 gap-4 mt-4">
            <div><Label>Salaire mensuel (FCFA)</Label><Input type="number" value={form.salary||0} onChange={e=>setForm({...form,salary:+e.target.value})}/></div>
            <div><Label>Compte bancaire / Wave</Label><Input value={form.bankAccount||""} onChange={e=>setForm({...form,bankAccount:e.target.value})}/></div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const employees = db.list("employees");
  const [form, setForm] = useState<any>({});
  useEffect(()=>{ setForm({ employeeId: employees[0]?.id || "", date: new Date().toISOString().slice(0,10), checkIn: new Date().toTimeString().slice(0,5), checkOut: "", status:"present", note:"" }); },[open]);
  const submit = () => {
    if (!form.employeeId) return toast.error("Employé requis");
    db.add("attendance", form);
    toast.success("Pointage enregistré");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Pointer un employé</DialogTitle></DialogHeader>
      <div className="space-y-4 mt-4">
        <div><Label>Employé</Label>
          <Select value={form.employeeId} onValueChange={v=>setForm({...form,employeeId:v})}><SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
          <div><Label>Statut</Label>
            <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="present">Présent</SelectItem><SelectItem value="late">Retard</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="leave">Congé</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Arrivée</Label><Input type="time" value={form.checkIn||""} onChange={e=>setForm({...form,checkIn:e.target.value})}/></div>
          <div><Label>Départ</Label><Input type="time" value={form.checkOut||""} onChange={e=>setForm({...form,checkOut:e.target.value})}/></div>
        </div>
        <div><Label>Note</Label><Input value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})}/></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Pointer</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

export function PayrollDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const employees = db.list("employees");
  const [form, setForm] = useState<any>({});
  useEffect(()=>{
    const first = employees[0];
    setForm({ employeeId: first?.id||"", month: new Date().toISOString().slice(0,7), baseSalary: first?.salary||0, bonuses:0, deductions:0, advances:0 });
  },[open]);
  const net = (form.baseSalary||0) + (form.bonuses||0) - (form.deductions||0) - (form.advances||0);
  const submit = () => {
    const emp = employees.find(e => e.id === form.employeeId);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : "Employé";
    const slip = db.add("payslips", { ...form, net, paidAt: new Date().toISOString() });
    if (net > 0) {
      addExpense({
        category: "Salaires",
        label: `Salaire ${form.month} — ${name}`,
        amount: net,
        source: "RH",
        paidBy: name,
        hasReceipt: true,
      });
    }
    archiveDocument({
      type: "bulletin",
      title: `Bulletin de paie ${form.month} — ${name}`,
      relatedTo: name,
      amount: net,
      entityType: "employee",
      entityId: form.employeeId,
      entityLabel: name,
      payload: { ...form, net, slipId: slip.id },
    });
    toast.success("Bulletin généré · dépense et sortie de caisse enregistrées");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Générer bulletin de paie</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4">
        <div><Label>Employé</Label>
          <Select value={form.employeeId} onValueChange={v=>{ const emp = employees.find(e=>e.id===v); setForm({...form,employeeId:v,baseSalary:emp?.salary||0}); }}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mois</Label><Input type="month" value={form.month} onChange={e=>setForm({...form,month:e.target.value})}/></div>
        <div><Label>Salaire de base</Label><Input type="number" value={form.baseSalary} onChange={e=>setForm({...form,baseSalary:+e.target.value})}/></div>
        <div><Label>Primes / Bonus</Label><Input type="number" value={form.bonuses} onChange={e=>setForm({...form,bonuses:+e.target.value})}/></div>
        <div><Label>Retenues</Label><Input type="number" value={form.deductions} onChange={e=>setForm({...form,deductions:+e.target.value})}/></div>
        <div><Label>Avances déjà versées</Label><Input type="number" value={form.advances} onChange={e=>setForm({...form,advances:+e.target.value})}/></div>
        <div className="p-3 bg-primary/10 rounded-lg flex justify-between"><span>Net à payer</span><strong className="text-primary text-lg">{net.toLocaleString()} FCFA</strong></div>
      </div>
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button><Button onClick={submit}>Valider la paie</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}
