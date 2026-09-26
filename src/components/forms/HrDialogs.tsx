import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import {
  db, recordPayrollPayment, recordPayrollInstallment, createEmployee, attachPayslipDocumentFile,
  terminateEmployee, reactivateEmployee, updateEmployeeSalary, grantSalaryAdvance,
  outstandingAdvancesFor, cancelPayrollPayment,
} from "@/lib/demo-store";
import { toast } from "sonner";
import { Users, Check, X, Loader2, Wallet, UserX, UserCheck, TrendingUp, History, Ban } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { useRole, can } from "@/lib/roles";

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
  const employees = db.list("employees").filter(e => e.status !== "inactive");
  const payslips = db.list("payslips");
  const [form, setForm] = useState<any>({});
  const [method, setMethod] = useState<string>("Cash");
  const [partial, setPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState(0);
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
      setPartial(false);
      setMethod("Cash");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open]);

  const outstanding = useMemo(() => form.employeeId ? outstandingAdvancesFor(form.employeeId) : { ids: [], total: 0 }, [form.employeeId, payslips]);
  const existingPayslip = useMemo(
    () => payslips.find(p => p.employeeId === form.employeeId && p.month === form.month && (p as any).status !== "cancelled"),
    [payslips, form.employeeId, form.month],
  );
  const alreadySettled = existingPayslip?.status === "posted";
  const completingPartial = existingPayslip?.status === "partial";

  const net = Math.max(0, (form.baseSalary||0) + (form.bonuses||0) - (form.deductions||0) - (form.advances||0));
  useEffect(() => { if (!completingPartial) setPartialAmount(net); }, [net, completingPartial]);

  const submit = async () => {
    if (submitting || alreadySettled) return;
    setSubmitting(true);
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp) {
      setSubmitting(false);
      toast.error("Employé requis");
      return;
    }
    const paidAt = new Date().toISOString();

    if (completingPartial) {
      try {
        const remaining = (existingPayslip as any).remaining ?? 0;
        const result = await recordPayrollInstallment({
          paymentId, employeeId: form.employeeId, month: form.month,
          baseSalary: (existingPayslip as any).baseSalary ?? 0,
          bonuses: (existingPayslip as any).bonuses ?? 0,
          deductions: (existingPayslip as any).deductions ?? 0,
          advances: (existingPayslip as any).advances ?? 0,
          amount: Math.min(partialAmount, remaining) || remaining,
          currency: "XOF", method, paidAt, idempotencyKey,
        });
        toast.success(result?.status === "posted" ? "Solde payé · bulletin complet" : "Acompte enregistré");
        onOpenChange(false);
        if (result?.status === "posted" && result?.document_id) {
          try {
            const { pdfPayslip } = await import("@/lib/pdf/templates");
            const doc = pdfPayslip({
              reference: result.document_id, month: form.month, paidAt,
              employee: { firstName: emp.firstName, lastName: emp.lastName, position: emp.position, department: emp.department, phone: emp.phone, email: emp.email },
              baseSalary: (existingPayslip as any).baseSalary ?? 0, bonuses: (existingPayslip as any).bonuses ?? 0,
              deductions: (existingPayslip as any).deductions ?? 0, advances: (existingPayslip as any).advances ?? 0,
              net: (existingPayslip as any).netDue ?? 0, currency: "XOF", paymentMethod: method,
            });
            await attachPayslipDocumentFile({ documentId: result.document_id, file: doc.toFile(`bulletin-${paymentId}.pdf`) });
            doc.save(`bulletin-${paymentId}`);
          } catch (docError) {
            toast.error(docError instanceof Error ? docError.message : "Le PDF du bulletin n'a pas pu être archivé (paiement bien enregistré).");
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Le versement n'a pas pu être enregistré.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      if (partial) {
        const result = await recordPayrollInstallment({
          paymentId, employeeId: form.employeeId, month: form.month,
          baseSalary: Number(form.baseSalary) || 0, bonuses: Number(form.bonuses) || 0,
          deductions: Number(form.deductions) || 0, advances: Number(form.advances) || 0,
          amount: Math.min(partialAmount, net) || net, currency: "XOF", method, paidAt, idempotencyKey,
          settleAdvanceIds: outstanding.ids,
        });
        toast.success(result?.status === "posted" ? "Bulletin généré · dépense et sortie de caisse enregistrées" : "Acompte enregistré — solde à verser plus tard");
        onOpenChange(false);
      } else {
        const result = await recordPayrollPayment({
          paymentId, employeeId: form.employeeId, month: form.month,
          baseSalary: Number(form.baseSalary) || 0, bonuses: Number(form.bonuses) || 0,
          deductions: Number(form.deductions) || 0, advances: Number(form.advances) || 0,
          currency: "XOF", method, paidAt, idempotencyKey, settleAdvanceIds: outstanding.ids,
        });
        toast.success("Bulletin généré · dépense et sortie de caisse enregistrées");
        onOpenChange(false);

        if (result?.document_id) {
          try {
            const { pdfPayslip } = await import("@/lib/pdf/templates");
            const doc = pdfPayslip({
              reference: result.document_id, month: form.month, paidAt,
              employee: { firstName: emp.firstName, lastName: emp.lastName, position: emp.position, department: emp.department, phone: emp.phone, email: emp.email },
              baseSalary: Number(form.baseSalary) || 0, bonuses: Number(form.bonuses) || 0,
              deductions: Number(form.deductions) || 0, advances: Number(form.advances) || 0,
              net, currency: "XOF", paymentMethod: method,
            });
            await attachPayslipDocumentFile({ documentId: result.document_id, file: doc.toFile(`bulletin-${paymentId}.pdf`) });
            doc.save(`bulletin-${paymentId}`);
          } catch (docError) {
            toast.error(docError instanceof Error ? docError.message : "Le PDF du bulletin n'a pas pu être archivé (paiement bien enregistré).");
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le paiement du salaire n'a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{completingPartial ? "Compléter le paiement" : "Générer bulletin de paie"}</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-4">
        <div><Label>Employé</Label>
          <Select value={form.employeeId} onValueChange={v=>{ const emp = employees.find(e=>e.id===v); setForm({...form,employeeId:v,baseSalary:emp?.salary||0}); }}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mois</Label><Input type="month" value={form.month} onChange={e=>setForm({...form,month:e.target.value})}/></div>

        {alreadySettled && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">Ce mois est déjà payé intégralement pour cet employé.</p>
        )}

        {completingPartial && !alreadySettled && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-800 dark:text-amber-400">
              Paiement partiel en cours — <strong>{formatFCFA((existingPayslip as any).paidAmount ?? 0)}</strong> déjà versé sur {formatFCFA((existingPayslip as any).netDue ?? 0)}, solde restant <strong>{formatFCFA((existingPayslip as any).remaining ?? 0)}</strong>.
            </div>
            <div><Label>Mode de paiement</Label>
              <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Montant versé maintenant</Label><MoneyInput value={partialAmount} onChange={setPartialAmount} /></div>
          </div>
        )}

        {!completingPartial && !alreadySettled && (
          <>
            <div><Label>Salaire de base</Label><MoneyInput value={form.baseSalary} onChange={v=>setForm({...form,baseSalary:v})}/></div>
            <div><Label>Primes / Bonus</Label><MoneyInput value={form.bonuses} onChange={v=>setForm({...form,bonuses:v})}/></div>
            <div><Label>Retenues</Label><MoneyInput value={form.deductions} onChange={v=>setForm({...form,deductions:v})}/></div>
            <div>
              <Label>Avances déjà versées</Label>
              <MoneyInput value={form.advances} onChange={v=>setForm({...form,advances:v})}/>
              {outstanding.total > 0 && (
                <button type="button" className="text-xs text-primary mt-1 hover:underline" onClick={() => setForm({...form, advances: outstanding.total})}>
                  {outstanding.ids.length} avance(s) en cours pour {formatFCFA(outstanding.total)} — cliquer pour déduire automatiquement
                </button>
              )}
            </div>
            <div><Label>Mode de paiement</Label>
              <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={partial} onCheckedChange={v => setPartial(!!v)} />
              Paiement partiel (acompte, solde à verser plus tard)
            </label>
            {partial && (
              <div><Label>Montant versé maintenant</Label><MoneyInput value={partialAmount} onChange={setPartialAmount} /></div>
            )}
            <div className="p-3 bg-primary/10 rounded-lg flex justify-between"><span>Net à payer</span><strong className="text-primary text-lg">{formatFCFA(net)}</strong></div>
          </>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={()=>onOpenChange(false)} disabled={submitting}>{alreadySettled ? "Fermer" : "Annuler"}</Button>
        {!alreadySettled && <Button onClick={submit} disabled={submitting}>{submitting ? "Enregistrement..." : completingPartial ? "Verser le solde" : "Valider la paie"}</Button>}
      </DialogFooter>
    </DialogContent></Dialog>
  );
}

type RowStatus = "idle" | "processing" | "success" | "error";
interface BulkRow {
  employeeId: string;
  selected: boolean;
  alreadyPaid: boolean;
  partialInProgress: boolean;
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
  const employees = db.list("employees").filter((e) => e.status !== "inactive");
  const payslips = db.list("payslips");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState<string>("Cash");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const postedIds = useMemo(() => {
    const ids = new Set<string>();
    payslips.forEach((p) => { if (p.month === month && (p as any).status === "posted") ids.add(p.employeeId); });
    return ids;
  }, [payslips, month]);
  const partialIds = useMemo(() => {
    const ids = new Set<string>();
    payslips.forEach((p) => { if (p.month === month && (p as any).status === "partial") ids.add(p.employeeId); });
    return ids;
  }, [payslips, month]);

  useEffect(() => {
    if (!open) return;
    setRunning(false);
    setDone(false);
    setRows(employees.map((e) => ({
      employeeId: e.id,
      selected: !postedIds.has(e.id) && !partialIds.has(e.id),
      alreadyPaid: postedIds.has(e.id),
      partialInProgress: partialIds.has(e.id),
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
  const selectedRows = rows.filter((r) => r.selected && !r.alreadyPaid && !r.partialInProgress);
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
            const { pdfPayslip } = await import("@/lib/pdf/templates");
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
            doc.save(`bulletin-${paymentId}`);
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
              <div key={r.employeeId} className={`flex flex-wrap items-center gap-3 p-3 ${r.alreadyPaid || r.partialInProgress ? "opacity-50" : ""}`}>
                <Checkbox
                  checked={r.selected}
                  disabled={r.alreadyPaid || r.partialInProgress || running}
                  onCheckedChange={(v) => patchRow(r.employeeId, { selected: !!v })}
                />
                <div className="min-w-[140px]">
                  <p className="text-sm font-semibold">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.position}</p>
                </div>
                {r.alreadyPaid ? (
                  <Badge variant="secondary" className="ml-auto">Déjà payé ce mois</Badge>
                ) : r.partialInProgress ? (
                  <Badge variant="outline" className="ml-auto border-amber-300 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">Acompte en cours — à compléter depuis "Payer salaire"</Badge>
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

/**
 * Fiche détail employé (lecture) — salaire + historique, avances en cours,
 * historique des bulletins. Les actions (avance, changement de salaire,
 * sortie, annulation de paie) ouvrent des dialogues dédiés au niveau de
 * Personnel.tsx, même pattern que VehicleDetailSheet pour les véhicules.
 */
export function EmployeeDetailDialog({
  employeeId, onOpenChange, onAdvance, onEditSalary, onTerminate, onReactivate, onCancelPayslip,
}: {
  employeeId: string | null;
  onOpenChange: (v: boolean) => void;
  onAdvance: (employeeId: string) => void;
  onEditSalary: (employeeId: string) => void;
  onTerminate: (employeeId: string) => void;
  onReactivate: (employeeId: string) => void;
  onCancelPayslip: (payslip: any) => void;
}) {
  const role = useRole();
  const employees = db.list("employees");
  const payslips = db.list("payslips");
  const advances = db.list("salaryAdvances");
  const emp = employees.find((e) => e.id === employeeId);

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {emp && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {emp.firstName} {emp.lastName}
                {emp.status === "inactive" ? (
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300">Inactif</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Actif</Badge>
                )}
              </DialogTitle>
              <DialogDescription>{emp.position} · {emp.department}</DialogDescription>
            </DialogHeader>

            {emp.status === "inactive" && (
              <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/30 p-3 text-sm text-slate-700 dark:text-slate-300">
                Sortie le {emp.terminatedAt ? new Date(emp.terminatedAt).toLocaleDateString("fr-FR") : "—"}
                {emp.terminationReason ? <> — {emp.terminationReason}</> : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Salaire actuel</p>
                <p className="font-bold text-lg">{formatFCFA(emp.salary)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Avances en cours</p>
                <p className="font-bold text-lg">
                  {formatFCFA(advances.filter((a) => a.employeeId === emp.id && a.status === "outstanding").reduce((s, a) => s + a.remainingAmount, 0))}
                </p>
              </div>
            </div>

            {emp.status !== "inactive" && can(role, "manage.payroll") && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => onAdvance(emp.id)}><Wallet size={14} /> Avance sur salaire</Button>
                <Button size="sm" variant="outline" onClick={() => onEditSalary(emp.id)}><TrendingUp size={14} /> Modifier le salaire</Button>
              </div>
            )}

            {emp.salaryHistory && emp.salaryHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><History size={14} /> Historique salarial</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {emp.salaryHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-3 py-2">
                      <span>{new Date(h.effectiveAt).toLocaleDateString("fr-FR")}{h.reason ? ` — ${h.reason}` : ""}</span>
                      <span className="font-semibold">{formatFCFA(h.previousSalary)} → {formatFCFA(h.newSalary)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advances.filter((a) => a.employeeId === emp.id).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Avances</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {advances.filter((a) => a.employeeId === emp.id).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt)).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-3 py-2">
                      <span>{new Date(a.grantedAt).toLocaleDateString("fr-FR")}{a.note ? ` — ${a.note}` : ""}</span>
                      <span className="flex items-center gap-2">
                        <strong>{formatFCFA(a.amount)}</strong>
                        <Badge variant="secondary" className={a.status === "outstanding" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"}>
                          {a.status === "outstanding" ? "En cours" : "Rattachée"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Bulletins de paie</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {payslips.filter((p) => p.employeeId === emp.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun bulletin pour l'instant.</p>
                )}
                {payslips.filter((p) => p.employeeId === emp.id).sort((a, b) => b.month.localeCompare(a.month)).map((p) => {
                  const status = (p as any).status ?? "posted";
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs rounded-lg bg-muted/30 px-3 py-2">
                      <span>{p.month}</span>
                      <span className="flex items-center gap-2">
                        <strong className={status === "cancelled" ? "line-through text-muted-foreground" : ""}>{formatFCFA(p.net)}</strong>
                        <Badge variant="secondary" className={
                          status === "cancelled" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"
                          : status === "partial" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        }>
                          {status === "cancelled" ? "Annulé" : status === "partial" ? "Partiel" : "Payé"}
                        </Badge>
                        {can(role, "cancel.payroll") && (status === "posted" || status === "partial") && (
                          <button type="button" title="Annuler ce paiement" className="text-rose-600 hover:text-rose-800" onClick={() => onCancelPayslip(p)}>
                            <Ban size={13} />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between w-full">
              {can(role, "manage.team") || can(role, "manage.payroll") ? (
                emp.status === "inactive" ? (
                  <Button variant="outline" size="sm" onClick={() => onReactivate(emp.id)}><UserCheck size={14} /> Réactiver</Button>
                ) : (
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onTerminate(emp.id)}><UserX size={14} /> Marquer comme inactif</Button>
                )
              ) : <span />}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TerminateEmployeeDialog({ employeeId, onOpenChange }: { employeeId: string | null; onOpenChange: (v: boolean) => void }) {
  const employees = db.list("employees");
  const emp = employees.find((e) => e.id === employeeId);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (employeeId) { setReason(""); setDate(new Date().toISOString().slice(0, 10)); setSubmitting(false); } }, [employeeId]);

  const submit = async () => {
    if (!employeeId || submitting) return;
    setSubmitting(true);
    try {
      await terminateEmployee({ employeeId, reason, terminatedAt: date });
      toast.success("Employé marqué comme inactif");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le statut n'a pas pu être modifié.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marquer {emp ? `${emp.firstName} ${emp.lastName}` : "l'employé"} comme inactif</DialogTitle>
          <DialogDescription>Fin de contrat, démission ou licenciement. L'employé sort de la paie du mois mais son historique (bulletins, avances) reste consultable.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Date de sortie</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Motif</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Démission, fin de CDD, licenciement…" /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement..." : "Confirmer la sortie"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UpdateSalaryDialog({ employeeId, onOpenChange }: { employeeId: string | null; onOpenChange: (v: boolean) => void }) {
  const employees = db.list("employees");
  const emp = employees.find((e) => e.id === employeeId);
  const [newSalary, setNewSalary] = useState(0);
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employeeId && emp) { setNewSalary(emp.salary); setEffectiveAt(new Date().toISOString().slice(0, 10)); setReason(""); setSubmitting(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const submit = async () => {
    if (!employeeId || submitting) return;
    if (!newSalary || newSalary <= 0) return toast.error("Le nouveau salaire doit être supérieur à zéro.");
    setSubmitting(true);
    try {
      await updateEmployeeSalary({ employeeId, newSalary, effectiveAt, reason });
      toast.success("Salaire mis à jour");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le salaire n'a pas pu être modifié.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier le salaire {emp ? `— ${emp.firstName} ${emp.lastName}` : ""}</DialogTitle>
          <DialogDescription>Salaire actuel : {emp ? formatFCFA(emp.salary) : "—"}. Le changement est tracé dans l'historique salarial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Nouveau salaire mensuel</Label><MoneyInput value={newSalary} onChange={setNewSalary} /></div>
          <div><Label>Date d'effet</Label><Input type="date" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} /></div>
          <div><Label>Motif (optionnel)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Augmentation annuelle, changement de poste…" /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement..." : "Valider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SalaryAdvanceDialog({ employeeId, onOpenChange }: { employeeId: string | null; onOpenChange: (v: boolean) => void }) {
  const employees = db.list("employees");
  const emp = employees.find((e) => e.id === employeeId);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<string>("Cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advanceId, setAdvanceId] = useState(() => crypto.randomUUID());
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (employeeId) {
      setAmount(0); setMethod("Cash"); setNote(""); setSubmitting(false);
      setAdvanceId(crypto.randomUUID());
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [employeeId]);

  const submit = async () => {
    if (!employeeId || submitting) return;
    if (!amount || amount <= 0) return toast.error("Le montant doit être supérieur à zéro.");
    setSubmitting(true);
    try {
      await grantSalaryAdvance({
        advanceId, employeeId, amount, currency: "XOF", method,
        grantedAt: new Date().toISOString(), note, idempotencyKey,
      });
      toast.success("Avance enregistrée · sortie de caisse effectuée");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'avance n'a pas pu être enregistrée.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!employeeId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avance sur salaire {emp ? `— ${emp.firstName} ${emp.lastName}` : ""}</DialogTitle>
          <DialogDescription>Sortie de caisse immédiate. Le montant sera automatiquement proposé en déduction lors du prochain paiement de salaire.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Montant</Label><MoneyInput value={amount} onChange={setAmount} /></div>
          <div><Label>Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Note (optionnel)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement..." : "Verser l'avance"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelPayrollDialog({ payslip, onOpenChange }: { payslip: any | null; onOpenChange: (v: boolean) => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (payslip) { setReason(""); setSubmitting(false); } }, [payslip]);

  const submit = async () => {
    if (!payslip || submitting) return;
    if (!reason.trim()) return toast.error("Le motif d'annulation est requis.");
    setSubmitting(true);
    try {
      const result = await cancelPayrollPayment({ payslipId: payslip.id, reason });
      toast.success(`Paiement annulé · ${formatFCFA(result?.total_reversed ?? 0)} recrédité(s) en caisse`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le paiement n'a pas pu être annulé.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!payslip} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Annuler ce paiement de salaire</DialogTitle>
          <DialogDescription>
            {payslip ? <>Mois {payslip.month} — {formatFCFA(payslip.net ?? payslip.netDue ?? 0)}. </> : null}
            La caisse sera recréditée du montant déjà versé et le mois redevient payable. Cette action est tracée et irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Motif de l'annulation *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Erreur de saisie, doublon…" /></div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Retour</Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={submitting}>{submitting ? "Annulation..." : "Confirmer l'annulation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
