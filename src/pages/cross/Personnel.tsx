import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { Plus, Phone, Mail, Clock, Wallet, User, Users } from "lucide-react";
import { EmployeeDialog, AttendanceDialog, PayrollDialog, BulkPayrollDialog } from "@/components/forms/HrDialogs";
import { useRole, can } from "@/lib/roles";
import { useTenant } from "@/lib/tenant";

const STATUS: Record<string, { label: string; cls: string }> = {
  present: { label: "Présent",  cls: "bg-emerald-50 text-emerald-700" },
  absent:  { label: "Absent",   cls: "bg-rose-50 text-rose-700" },
  leave:   { label: "Congé",    cls: "bg-amber-50 text-amber-700" },
  late:    { label: "Retard",   cls: "bg-orange-50 text-orange-700" },
};

export function Personnel() {
  const role = useRole();
  const canPay = can(role, "manage.payroll");
  const { userId } = useTenant();
  const employees = useCollection("employees");
  const attendance = useCollection("attendance");
  const payslips = useCollection("payslips");
  const [openEmp, setOpenEmp] = useState(false);
  const [openAtt, setOpenAtt] = useState(false);
  const [openPay, setOpenPay] = useState(false);
  const [openBulkPay, setOpenBulkPay] = useState(false);

  if (role === "terrain") {
    const me = employees.find((e) => e.userId === userId);
    const myPayslips = me ? payslips.filter((p) => p.employeeId === me.id).sort((a, b) => b.month.localeCompare(a.month)) : [];
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Ma fiche</h1>
          <p className="text-muted-foreground mt-1">Vos informations et vos bulletins de paie.</p>
        </div>

        {!me ? (
          <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
            <CardContent className="p-6 text-sm text-amber-900">
              Aucune fiche employé associée à votre compte. Contactez votre responsable.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                  {me.firstName[0]}{me.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-lg">{me.firstName} {me.lastName}</p>
                  <p className="text-sm text-muted-foreground">{me.position} · {me.department}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Phone size={13} /> {me.phone || "—"}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Mail size={13} /> {me.email || "—"}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Embauché·e le {new Date(me.hiredAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold mb-3">Mes bulletins de paie</h3>
                {myPayslips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun bulletin pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {myPayslips.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                        <span>{p.month}</span>
                        <span className="font-bold">{formatFCFA(p.net)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  const total = employees.length;
  const present = employees.filter(e => e.status === "present").length;
  const absent = employees.filter(e => e.status === "absent").length;
  const massSalary = employees.reduce((s, e) => s + e.salary, 0);
  const paidThisMonth = payslips.filter(p => p.month === new Date().toISOString().slice(0,7)).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground mt-1">Équipe, présences, congés et masse salariale.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenAtt(true)}><Clock size={16}/> Pointer</Button>
          {canPay && (
            <>
              <Button variant="outline" onClick={() => setOpenPay(true)}><Wallet size={16}/> Payer salaire</Button>
              <Button variant="outline" onClick={() => setOpenBulkPay(true)}><Users size={16}/> Paie du mois</Button>
            </>
          )}
          <Button onClick={() => setOpenEmp(true)}><Plus size={16} /> Ajouter employé</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label="Employés"        value={total.toString()}           tone="blue" />
        <Mini label="Présents"        value={present.toString()}         tone="emerald" />
        <Mini label="Absents/Congés"  value={(absent + (total - present - absent)).toString()} tone="amber" />
        <Mini label="Masse salariale" value={formatFCFA(massSalary)}     tone="indigo" />
      </div>

      {(attendance.length>0 || payslips.length>0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attendance.length>0 && <Card><CardContent className="p-5"><h3 className="font-semibold mb-3 text-sm">Pointages récents ({attendance.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto text-xs">{attendance.slice(0,5).map(a=>{ const emp = employees.find(e=>e.id===a.employeeId); return <div key={a.id} className="flex justify-between p-2 bg-muted/30 rounded"><span>{emp?.firstName} {emp?.lastName}</span><span className="text-muted-foreground">{a.date} {a.checkIn||""}</span></div>;})}</div>
          </CardContent></Card>}
          {payslips.length>0 && <Card><CardContent className="p-5"><h3 className="font-semibold mb-3 text-sm">Bulletins du mois ({paidThisMonth})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto text-xs">{payslips.slice(0,5).map(p=>{ const emp = employees.find(e=>e.id===p.employeeId); return <div key={p.id} className="flex justify-between p-2 bg-muted/30 rounded"><span>{emp?.firstName} {emp?.lastName}</span><strong className="text-primary">{formatFCFA(p.net)}</strong></div>;})}</div>
          </CardContent></Card>}
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Employé</th>
                <th className="text-left px-6 py-3 font-semibold">Poste</th>
                <th className="text-left px-6 py-3 font-semibold">Département</th>
                <th className="text-left px-6 py-3 font-semibold">Contact</th>
                <th className="text-right px-6 py-3 font-semibold">Salaire</th>
                <th className="text-left px-6 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map(e => {
                const st = STATUS[e.status] || STATUS.present;
                return (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs">
                          {e.firstName[0]}{e.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-muted-foreground">Embauché·e {new Date(e.hiredAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">{e.position}</td>
                    <td className="px-6 py-3"><span className="text-xs bg-muted px-2 py-1 rounded-md">{e.department}</span></td>
                    <td className="px-6 py-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Phone size={11} /> {e.phone}</div>
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Mail size={11} /> {e.email}</div>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">{formatFCFA(e.salary)}</td>
                    <td className="px-6 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-md ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <EmployeeDialog open={openEmp} onOpenChange={setOpenEmp} />
      <AttendanceDialog open={openAtt} onOpenChange={setOpenAtt} />
      <PayrollDialog open={openPay} onOpenChange={setOpenPay} />
      <BulkPayrollDialog open={openBulkPay} onOpenChange={setOpenBulkPay} />
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: "blue"|"emerald"|"amber"|"indigo" }) {
  const tones = {
    blue: "from-white to-blue-50 border-blue-200/70",
    emerald: "from-white to-emerald-50 border-emerald-200/70",
    amber: "from-white to-amber-50 border-amber-200/70",
    indigo: "from-white to-indigo-50 border-indigo-200/70",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="font-display font-bold text-xl mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
