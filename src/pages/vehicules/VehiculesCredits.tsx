import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { vehicleCredits, vehicles } from "@/lib/demo-data";
import { CreditCard, AlertTriangle } from "lucide-react";

export function VehiculesCredits() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Ventes à crédit</h1>
        <p className="text-muted-foreground mt-1">Suivi des échéances, apports et alertes de retard.</p>
      </div>

      <div className="grid gap-4">
        {vehicleCredits.map(c => {
          const v = vehicles.find(x => x.id === c.vehicleId)!;
          const paid = c.downPayment + c.paidMonths * c.monthlyPayment;
          const remaining = c.total - paid;
          const pct = Math.round((paid / c.total) * 100);
          return (
            <Card key={c.id} className={`shadow-sm border-l-4 ${c.status === "late" ? "border-l-rose-500" : "border-l-emerald-500"}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="text-4xl">{v.photo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                      {c.status === "late" && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 inline-flex items-center gap-1">
                          <AlertTriangle size={10} /> EN RETARD
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5"><CreditCard size={12} className="inline mr-1" /> {c.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prochaine échéance</p>
                    <p className="font-semibold">{new Date(c.nextDueDate).toLocaleDateString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground">{formatFCFA(c.monthlyPayment)} / mois</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span><strong>{c.paidMonths}</strong> / {c.totalMonths} mensualités payées</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${c.status === "late" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t text-sm">
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Montant total</p><p className="font-semibold mt-0.5">{formatFCFA(c.total)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Apport</p><p className="font-semibold mt-0.5">{formatFCFA(c.downPayment)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Payé</p><p className="font-semibold mt-0.5 text-emerald-700">{formatFCFA(paid)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Reste</p><p className="font-semibold mt-0.5 text-rose-700">{formatFCFA(remaining)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
