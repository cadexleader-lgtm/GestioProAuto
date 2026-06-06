import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { employees } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { Users2, Plus, Phone, Mail } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  present: { label: "Présent",  cls: "bg-emerald-50 text-emerald-700" },
  absent:  { label: "Absent",   cls: "bg-rose-50 text-rose-700" },
  leave:   { label: "Congé",    cls: "bg-amber-50 text-amber-700" },
};

export function Personnel() {
  const total = employees.length;
  const present = employees.filter(e => e.status === "present").length;
  const absent = employees.filter(e => e.status === "absent").length;
  const massSalary = employees.reduce((s, e) => s + e.salary, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground mt-1">Équipe, présences, congés et masse salariale.</p>
        </div>
        <Button><Plus size={16} /> Ajouter un employé</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Mini label="Employés"        value={total.toString()}           tone="blue" />
        <Mini label="Présents"        value={present.toString()}         tone="emerald" />
        <Mini label="Absents/Congés"  value={(absent + (total - present - absent)).toString()} tone="amber" />
        <Mini label="Masse salariale" value={formatFCFA(massSalary)}     tone="indigo" />
      </div>

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
                const st = STATUS[e.status];
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
