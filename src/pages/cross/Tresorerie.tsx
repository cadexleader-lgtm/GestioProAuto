import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Wallet, ArrowLeftRight, Scale, PiggyBank, Receipt } from "lucide-react";
import { CashMovementDialog } from "@/components/forms/FinanceDialogs";
import { RevenueEvolutionChart } from "@/components/analytics/RevenueEvolutionChart";

type Period = "day" | "month" | "year" | "all";

export function Tresorerie() {
  const cashMovements = useCollection("cash");
  const expenses = useCollection("expenses");
  const [type, setType] = useState<"in"|"out"|"transfer"|null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [account, setAccount] = useState("all");

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const yearKey = todayKey.slice(0, 4);
  const inPeriod = (d: string) =>
    period === "all" ? true
      : period === "day" ? d.startsWith(todayKey)
      : period === "month" ? d.startsWith(monthKey)
      : d.startsWith(yearKey);

  const totalIn = cashMovements.filter(m => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const totalOut = cashMovements.filter(m => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const balance = totalIn - totalOut;

  const periodMoves = useMemo(() => cashMovements
    .filter(m => inPeriod(m.date))
    .filter(m => account === "all" || m.source === account)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1)),
  [cashMovements, period, account]);

  const periodIn = periodMoves.filter(m => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const periodOut = periodMoves.filter(m => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const net = periodIn - periodOut;

  const accounts = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    cashMovements.forEach(m => {
      const a = map.get(m.source) ?? { in: 0, out: 0 };
      if (m.type === "in") a.in += m.amount; else a.out += m.amount;
      map.set(m.source, a);
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, balance: v.in - v.out }))
      .sort((a, b) => b.balance - a.balance);
  }, [cashMovements]);

  const expensesPeriod = expenses.filter(e => inPeriod(e.date)).reduce((s, e) => s + e.amount, 0);

  const journal = useMemo(() => {
    const asc = periodMoves.slice().reverse();
    let running = 0;
    const rows = asc.map(m => {
      running += m.type === "in" ? m.amount : -m.amount;
      return { ...m, running };
    });
    return rows.reverse();
  }, [periodMoves]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Trésorerie & Caisse</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Journal de caisse synchronisé : ventes, locations, crédits, salaires et dépenses.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button variant="outline" size="sm" onClick={() => setType("in")}><ArrowDownLeft size={15}/> Entrée</Button>
          <Button variant="outline" size="sm" onClick={() => setType("out")}><ArrowUpRight size={15}/> Sortie</Button>
          <Button size="sm" onClick={() => setType("transfer")}><ArrowLeftRight size={15}/> Virement</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Solde de caisse" value={formatFCFA(balance)} icon={<Wallet size={17} className="text-primary" />} tone="primary" />
        <Kpi label="Encaissements période" value={formatFCFA(periodIn)} icon={<ArrowDownLeft size={17} className="text-emerald-600" />} tone="emerald" />
        <Kpi label="Décaissements période" value={formatFCFA(periodOut)} icon={<ArrowUpRight size={17} className="text-rose-600" />} tone="rose" />
        <Kpi
          label="Résultat net période"
          value={`${net >= 0 ? "+" : "−"}${formatFCFA(Math.abs(net))}`}
          icon={<Scale size={17} className={net >= 0 ? "text-emerald-600" : "text-rose-600"} />}
          tone={net >= 0 ? "emerald" : "rose"}
        />
      </div>

      <div className="grid grid-cols-2 sm:max-w-md gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Aujourd'hui</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
            <SelectItem value="all">Tout l'historique</SelectItem>
          </SelectContent>
        </Select>
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les caisses</SelectItem>
            {accounts.map(a => <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <RevenueEvolutionChart title="Flux financiers (temps réel)" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold mb-4 inline-flex items-center gap-2"><PiggyBank size={16} /> Caisses & comptes</h3>
            <div className="space-y-2">
              {accounts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Aucun mouvement</p>}
              {accounts.map(a => (
                <button
                  key={a.name}
                  onClick={() => setAccount(account === a.name ? "all" : a.name)}
                  className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition hover:bg-muted/40 ${account === a.name ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">+{formatFCFA(a.in)} · −{formatFCFA(a.out)}</p>
                  </div>
                  <span className={`font-display font-bold text-sm shrink-0 ${a.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatFCFA(a.balance)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Receipt size={13} /> Dépenses de la période</span>
                <strong className="text-rose-700">{formatFCFA(expensesPeriod)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trésorerie disponible</span>
                <strong className={balance >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatFCFA(balance)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-6 pb-4 gap-3">
              <h3 className="font-display font-semibold">Journal de caisse ({journal.length})</h3>
              <Badge variant="secondary" className="shrink-0">Solde {formatFCFA(balance)}</Badge>
            </div>
            <div className="border-t divide-y max-h-[520px] overflow-y-auto">
              {journal.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Aucun mouvement sur cette période</p>
              )}
              {journal.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/30">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {m.type === "in" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.source} · {new Date(m.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${m.type === "in" ? "text-emerald-700" : "text-rose-700"}`}>
                      {m.type === "in" ? "+" : "−"}{formatFCFA(m.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">Solde {formatFCFA(m.running)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {type && <CashMovementDialog open={!!type} onOpenChange={(v)=>!v && setType(null)} type={type} />}
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary"|"emerald"|"rose" }) {
  const cls = {
    primary: "from-white to-blue-50 border-primary/30",
    emerald: "from-white to-emerald-50 border-emerald-200/70",
    rose: "from-white to-rose-50 border-rose-200/70",
  }[tone];
  return (
    <Card className={`rounded-2xl bg-gradient-to-br ${cls}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">{label}</p>
          <span className="shrink-0">{icon}</span>
        </div>
        <p className="font-display font-bold text-xl sm:text-2xl tabular-nums truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
