import { Card, CardContent } from "@/components/ui/card";
import { cashMovements } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

export function Tresorerie() {
  const totalIn = cashMovements.filter(m => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const totalOut = cashMovements.filter(m => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const balance = totalIn - totalOut;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Trésorerie & Caisse</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble des mouvements financiers et du solde.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-200/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Entrées du jour</p>
              <ArrowDownLeft className="text-emerald-600" size={18} />
            </div>
            <p className="font-display font-bold text-2xl">{formatFCFA(totalIn)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-rose-50 border-rose-200/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Sorties du jour</p>
              <ArrowUpRight className="text-rose-600" size={18} />
            </div>
            <p className="font-display font-bold text-2xl">{formatFCFA(totalOut)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-blue-50 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Solde de caisse</p>
              <Wallet className="text-primary" size={18} />
            </div>
            <p className="font-display font-bold text-2xl text-primary">{formatFCFA(balance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <h3 className="font-display font-semibold p-6 pb-4">Historique des mouvements</h3>
          <div className="border-t divide-y">
            {cashMovements.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  m.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}>
                  {m.type === "in" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.source} · {new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className={`font-bold text-sm ${m.type === "in" ? "text-emerald-700" : "text-rose-700"}`}>
                  {m.type === "in" ? "+" : "−"}{formatFCFA(m.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
