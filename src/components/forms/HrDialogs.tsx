import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { db, recordPayrollPayment, createEmployee, attachPayslipDocumentFile } from "@/lib/demo-store";
import { pdfPayslip } from "@/lib/pdf/templates";
import { toast } from "sonner";
import { Users, Check, X, Loader2, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/format";

const PAYMENT_METHODS = ["Cash", "Wave", "Orange Money", "Virement", "Chèque"] as const;

const DEPTS = ["Direction","Ventes","Caisse","Stock","Finance","Logistique","RH","Cuisine","Service","Technique"];

export function EmployeeDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const [form, setForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  useEffect(()=>{
    setForm({ firstName:"", lastName:"", position:"", department:"Ventes", phone:"", email:"", hiredAt:new Date().toISOString().slice(0,10), salary:150000, status:"present", contractType:"CDI", idCard:"", bankAccount:"", address:""});
    setSubmitting(false);
    if (open) setEmployeeId(crypto.randomUUID());
  },[open]);
  const submit = async () => {
    if (!form.firstName || !form.lastName) return toast.error("Nom requis");
    if (submitting) return;
    setSubmitting(true);
    try {
      await createEmployee({ ...form, employeeId });
      toast.success("Employé ajouté");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'employé n'a pas pu être ajouté.");
    } finally {
      setSubmitting(false);
    }
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
        <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)} disabled={submitting}>Annuler</Button><Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement..." : "Enregistrer"}</Button></DialogFooter>
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
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState(() => crypto.randomUUID());
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(()=>{
    const first = employees[0];
    setForm({ employeeId: first?.id||"", month: new Date().toISOString().slice(0,7), baseSalary: first?.salary||0, bonuses:0, deductions:0, advances:0 });
    if (open) {
      setPaymentId(crypto.randomUUID());
      setIdempotencyKey(crypto.randomUUID());
      setSubmitting(false);
    }
  },[open]);
  const net = (form.baseSalary||0) + (form.bonuses||0) - (form.deductions||0) - (form.advances||0);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp) {
      setSubmitting(false);
      toast.error("Employé requis");
      return;
    }
    const paidAt = new Date().toISOString();
    try {
      const result = await recordPayrollPayment({
        paymentId,
        employeeId: form.employeeId,
        month: form.month,
        baseSalary: Number(form.baseSalary) || 0,
        bonuses: Number(form.bonuses) || 0,
        deductions: Number(form.deductions) || 0,
        advances: Number(form.advances) || 0,
        currency: "XOF",
        method: "Cash",
        paidAt,
        idempotencyKey,
      });
      toast.success("Bulletin généré · dépense et sortie de caisse enregistrées");
      onOpenChange(false);

      if (result?.document_id) {
        try {
          const doc = pdfPayslip({
            reference: result.document_id,
            month: form.month,
            paidAt,
            employee: { firstName: emp.firstName, lastName: emp.lastName, position: emp.position, department: emp.department, phone: emp.phone, email: emp.email },
            baseSalary: Number(form.baseSalary) || 0,
            bonuses: Number(form.bonuses) || 0,
            deductions: Number(form.deductions) || 0,
            advances: Number(form.advances) || 0,
            net,
            currency: "XOF",
            paymentMethod: "Cash",
          });
          await attachPayslipDocumentFile({ documentId: result.document_id, file: doc.toFile(`bulletin-${paymentId}.pdf`) });
        } catch (docError) {
          toast.error(docError instanceof Error ? docError.message : "Le PDF du bulletin n'a pas pu être archivé (paiement bien enregistré).");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le paiement du salaire n'a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
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
      <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>onOpenChange(false)} disabled={submitting}>Annuler</Button><Button onClick={submit} disabled={submitting}>{submitting ? "Enregistrement..." : "Valider la paie"}</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

type RowStatus = "idle" | "processing" | "success" | "error";
interface BulkRow {
  employeeId: string;
  selected: boolean;
  alreadyPaid: boolean;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advances: number;
  status: RowStatus;
  error?: string;
}

/**
 * Paiement en lot de la paie du mois — traite chaque employé sélectionné
 * séquentiellement (jamais en parallèle) via la même RPC transactionnelle
 * que le paiement individuel : deux paiements simultanés sur le même
 * compte de caisse liraient le même solde disponible avant que l'un des
 * deux ne soit committé, et pourraient tous les deux passer même si leur
 * somme dépasse le solde réel. Un échec sur un employé n'annule pas les
 * autres — chaque paiement est sa propre transaction, comme en réalité.
 */
export function BulkPayrollDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const employees = db.list("employees");
  const payslips = db.list("payslips");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState<string>("Cash");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const paidEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    payslips.forEach((p) => { if (p.month === month && (p as any).status !== "reversed") ids.add(p.employeeId); });
    return ids;
  }, [payslips, month]);

  useEffect(() => {
    if (!open) return;
    setRunning(false);
    setDone(false);
    setRows(employees.map((e) => ({
      employeeId: e.id,
      selected: !paidEmployeeIds.has(e.id),
      alreadyPaid: paidEmployeeIds.has(e.id),
      baseSalary: e.salary || 0,
      bonuses: 0,
      deductions: 0,
      advances: 0,
      status: "idle",
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, month]);

  const patchRow = (employeeId: string, patch: Partial<BulkRow>) =>
    setRows((rs) => rs.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r)));

  const netOf = (r: BulkRow) => Math.max(0, r.baseSalary + r.bonuses - r.deductions - r.advances);
  const selectedRows = rows.filter((r) => r.selected && !r.alreadyPaid);
  const totalNet = selectedRows.reduce((s, r) => s + netOf(r), 0);

  const run = async () => {
    if (running || selectedRows.length === 0) return;
    setRunning(true);
    setDone(false);
    let ok = 0, failed = 0;

    for (const row of selectedRows) {
      const emp = employees.find((e) => e.id === row.employeeId);
      if (!emp) continue;
      patchRow(row.employeeId, { status: "processing" });
      const paymentId = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();
      const paidAt = new Date().toISOString();
      const net = netOf(row);
      try {
        const result = await recordPayrollPayment({
          paymentId,
          employeeId: row.employeeId,
          month,
          baseSalary: row.baseSalary,
          bonuses: row.bonuses,
          deductions: row.deductions,
          advances: row.advances,
          currency: "XOF",
          method,
          paidAt,
          idempotencyKey,
        });
        patchRow(row.employeeId, { status: "success" });
        ok++;

        if (result?.document_id) {
          try {
            const doc = pdfPayslip({
              reference: result.document_id,
              month,
              paidAt,
              employee: { firstName: emp.firstName, lastName: emp.lastName, position: emp.position, department: emp.department, phone: emp.phone, email: emp.email },
              baseSalary: row.baseSalary,
              bonuses: row.bonuses,
              deductions: row.deductions,
              advances: row.advances,
              net,
              currency: "XOF",
              paymentMethod: method,
            });
            await attachPayslipDocumentFile({ documentId: result.document_id, file: doc.toFile(`bulletin-${paymentId}.pdf`) });
          } catch {
            // Paiement bien enregistré ; seul le PDF n'a pas pu être archivé — pas bloquant pour la suite du lot.
          }
        }
      } catch (error) {
        failed++;
        patchRow(row.employeeId, { status: "error", error: error instanceof Error ? error.message : "Échec du paiement." });
      }
    }

    setRunning(false);
    setDone(true);
    if (failed === 0) toast.success(`${ok} salaire(s) payé(s) avec succès.`);
    else toast.error(`${ok} payé(s), ${failed} échec(s) — voir le détail ci-dessous.`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users size={18} /> Paie du mois — paiement en lot</DialogTitle>
          <DialogDescription>Chaque salaire est payé individuellement et de façon sécurisée (solde vérifié, aucun doublon possible).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 mt-2">
          <div className="w-40">
            <Label>Mois</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={running} />
          </div>
          <div className="w-44">
            <Label>Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 rounded-xl border divide-y max-h-[420px] overflow-y-auto">
          {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Aucun employé.</p>}
          {rows.map((r) => {
            const emp = employees.find((e) => e.id === r.employeeId);
            if (!emp) return null;
            return (
              <div key={r.employeeId} className={`flex flex-wrap items-center gap-3 p-3 ${r.alreadyPaid ? "opacity-50" : ""}`}>
                <Checkbox
                  checked={r.selected}
                  disabled={r.alreadyPaid || running}
                  onCheckedChange={(v) => patchRow(r.employeeId, { selected: !!v })}
                />
                <div className="min-w-[140px]">
                  <p className="text-sm font-semibold">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.position}</p>
                </div>
                {r.alreadyPaid ? (
                  <Badge variant="secondary" className="ml-auto">Déjà payé ce mois</Badge>
                ) : (
                  <>
                    <div className="w-28"><Label className="text-[10px]">Salaire base</Label><MoneyInput value={r.baseSalary} onChange={(v) => patchRow(r.employeeId, { baseSalary: v })} className="h-8 text-xs" /></div>
                    <div className="w-24"><Label className="text-[10px]">Primes</Label><MoneyInput value={r.bonuses} onChange={(v) => patchRow(r.employeeId, { bonuses: v })} className="h-8 text-xs" /></div>
                    <div className="w-24"><Label className="text-[10px]">Retenues</Label><MoneyInput value={r.deductions} onChange={(v) => patchRow(r.employeeId, { deductions: v })} className="h-8 text-xs" /></div>
                    <div className="w-24"><Label className="text-[10px]">Avances</Label><MoneyInput value={r.advances} onChange={(v) => patchRow(r.employeeId, { advances: v })} className="h-8 text-xs" /></div>
                    <div className="ml-auto text-right min-w-[90px]">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Net</p>
                      <p className="font-bold text-sm">{formatFCFA(netOf(r))}</p>
                    </div>
                    <div className="w-6 flex justify-center">
                      {r.status === "processing" && <Loader2 size={16} className="animate-spin text-primary" />}
                      {r.status === "success" && <Check size={16} className="text-emerald-600" />}
                      {r.status === "error" && <span title={r.error}><X size={16} className="text-rose-600" /></span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
          <span className="text-sm inline-flex items-center gap-1.5"><Wallet size={15} /> {selectedRows.length} employé(s) sélectionné(s)</span>
          <strong className="text-primary text-lg">{formatFCFA(totalNet)}</strong>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>{done ? "Fermer" : "Annuler"}</Button>
          <Button onClick={() => void run()} disabled={running || selectedRows.length === 0}>
            {running ? "Paiement en cours..." : `Payer ${selectedRows.length} salaire(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
