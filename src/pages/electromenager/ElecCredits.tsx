import { Card, CardContent } from "@/components/ui/card";
import { applianceCredits } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { CreditCard, AlertTriangle } from "lucide-react";

export function ElecCredits() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Ventes à crédit</h1>
        <p className="text-muted-foreground mt-1">Acomptes, échéanciers et reste à payer pour vos clients.</p>
      </div>

      <div className="grid gap-4">
        {applianceCredits.map(c => {
          const paid = c.downPayment + c.paidMonths * c.monthlyPayment;
          const remaining = c.total - paid;
          const pct = Math.round((paid / c.total) * 100);
          return (
            <Card key={c.id} className={`shadow-sm border-l-4 ${c.status === "late" ? "border-l-rose-500" : "border-l-emerald-500"}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-primary" />
                      <h3 className="font-display font-bold">{c.customer}</h3>
                      {c.status === "late" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 inline-flex items-center gap-1"><AlertTriangle size={10} /> EN RETARD</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.productName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Mensualité</p>
                    <p className="font-semibold">{formatFCFA(c.monthlyPayment)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span><strong>{c.paidMonths}</strong>/{c.totalMonths} mensualités</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${c.status === "late" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-xs pt-4 border-t">
                  <div><p className="font-bold uppercase text-muted-foreground text-[10px]">Total</p><p className="font-semibold mt-1">{formatFCFA(c.total)}</p></div>
                  <div><p className="font-bold uppercase text-muted-foreground text-[10px]">Acompte</p><p className="font-semibold mt-1">{formatFCFA(c.downPayment)}</p></div>
                  <div><p className="font-bold uppercase text-muted-foreground text-[10px]">Payé</p><p className="font-semibold mt-1 text-emerald-700">{formatFCFA(paid)}</p></div>
                  <div><p className="font-bold uppercase text-muted-foreground text-[10px]">Reste</p><p className="font-semibold mt-1 text-rose-700">{formatFCFA(remaining)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
