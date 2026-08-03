import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, addExpense } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { Receipt, Plus, Image as ImageIcon, Search, Wrench, Users, Car, Store, TrendingDown, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExpenseDialog } from "@/components/forms/FinanceDialogs";
import { toast } from "sonner";

const COLORS = ["hsl(221 83% 53%)","hsl(48 96% 53%)","hsl(142 71% 45%)","hsl(280 65% 60%)","hsl(340 75% 55%)","hsl(199 89% 48%)","hsl(25 95% 53%)","hsl(174 62% 47%)","hsl(258 75% 63%)","hsl(0 0% 60%)"];

type Period = "day" | "month" | "year" | "all";

const SOURCE_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  Automobile: { label: "Automobile", icon: <Car size={12} />, cls: "bg-indigo-50 text-indigo-700" },
  RH:         { label: "Personnel",  icon: <Users size={12} />, cls: "bg-violet-50 text-violet-700" },
  Boutique:   { label: "Boutique",   icon: <Store size={12} />, cls: "bg-emerald-50 text-emerald-700" },
  Manuel:     { label: "Saisie",     icon: <Receipt size={12} />, cls: "bg-slate-100 text-slate-600" },
};

function sourceOf(e: any): string {
  if (e.source && SOURCE_META[e.source]) return e.source;
  if (e.category === "Salaires") return "RH";
  if (e.category === "Maintenance" || e.category === "Achat véhicule") return "Automobile";
  if (e.category === "Achat stock") return "Boutique";
  return "Manuel";
}

export function Depenses() {
  const expenses = useCollection("expenses");
  const employees = useCollection("employees");
  const maintenances = useCollection("vehicleMaintenances");
  const cash = useCollection("cash");

  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [cat, setCat] = useState("all");
  const [src, setSrc] = useState("all");
  const [q, setQ] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const yearKey = todayKey.slice(0, 4);

  const inPeriod = (d: string) =>
    period === "all" ? true
      : period === "day" ? d.startsWith(todayKey)
      : period === "month" ? d.startsWith(monthKey)
      : d.startsWith(yearKey);

  const totalToday = expenses.filter(e => e.date.startsWith(todayKey)).reduce((s, e) => s + e.amount, 0);
  const totalMonth = expenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const totalYear = expenses.filter(e => e.date.startsWith(yearKey)).reduce((s, e) => s + e.amount, 0);

  // Recettes du mois (caisse) pour situer le poids des dépenses
  const revenueMonth = cash
    .filter(m => m.type === "in" && m.date.slice(0, 7) === monthKey)
    .reduce((s, m) => s + m.amount, 0);
  const ratio = revenueMonth > 0 ? Math.round((totalMonth / revenueMonth) * 100) : 0;

  const filtered = useMemo(() => expenses
    .filter(e => inPeriod(e.date))
    .filter(e => cat === "all" || e.category === cat)
    .filter(e => src === "all" || sourceOf(e) === src)
    .filter(e => !q || `${e.label} ${e.category}`.toLowerCase().includes(q.toLowerCase()))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1)),
  [expenses, period, cat, src, q]);

  const periodTotal = filtered.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => { const s = sourceOf(e); map.set(s, (map.get(s) ?? 0) + e.amount); });
    return [...map.entries()].map(([name, value]) => ({ name: SOURCE_META[name]?.label ?? name, value }));
  }, [filtered]);

  const categories = useMemo(() => [...new Set(expenses.map(e => e.category))], [expenses]);

  // Actions rapides synchronisées
  const payrollTotal = employees.reduce((s, e: any) => s + (e.salary || 0), 0);
  const alreadyPaid = expenses.some(e => e.category === "Salaires" && e.date.startsWith(monthKey));

  const paySalaries = () => {
    if (payrollTotal <= 0) return toast.error("Aucun salaire à payer");
    addExpense({
      category: "Salaires",
      label: `Salaires ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      amount: payrollTotal,
      source: "RH",
      hasReceipt: true,
    });
    toast.success(`Salaires payés — ${formatFCFA(payrollTotal)} décaissés de la caisse`);
  };

  const pendingMaint = maintenances.filter((m: any) => m.status !== "done");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Dépenses</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Toutes les sorties de l'entreprise — salaires, maintenance, achats, charges — synchronisées avec la caisse.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shadow-lg shadow-primary/20 shrink-0"><Plus size={16} /> Ajouter</Button>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={paySalaries} disabled={alreadyPaid}>
          <Users size={14} /> {alreadyPaid ? "Salaires du mois payés" : `Payer salaires (${formatFCFA(payrollTotal)})`}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCat("Maintenance")}>
          <Wrench size={14} /> Dépenses maintenance
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setPeriod("month"); setCat("all"); setSrc("all"); setQ(""); }}>
          Réinitialiser les filtres
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Dépenses du jour" value={formatFCFA(totalToday)} tone="blue" />
        <Stat label="Dépenses du mois" value={formatFCFA(totalMonth)} tone="indigo" />
        <Stat label="Dépenses de l'année" value={formatFCFA(totalYear)} tone="rose" />
        <Stat label="Poids / recettes du mois" value={`${ratio}%`} tone="amber" hint={`Recettes ${formatFCFA(revenueMonth)}`} />
      </div>

      {pendingMaint.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-center gap-3">
          <Wrench size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingMaint.length}</strong> maintenance(s) en cours — le coût sera automatiquement enregistré ici à la clôture.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Aujourd'hui</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={src} onValueChange={setSrc}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modules</SelectItem>
            {Object.entries(SOURCE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold mb-1">Répartition par catégorie</h3>
            <p className="text-xs text-muted-foreground mb-4">Total période : <strong>{formatFCFA(periodTotal)}</strong></p>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold mb-4">Dépenses par module</h3>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={bySource}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="hsl(221 83% 53%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 pb-4 gap-3">
            <h3 className="font-display font-semibold">Journal des dépenses ({filtered.length})</h3>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
              <TrendingDown size={15} /> {formatFCFA(periodTotal)}
            </span>
          </div>
          <div className="border-t divide-y max-h-[460px] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune dépense sur cette période</p>
            )}
            {filtered.map(e => {
              const meta = SOURCE_META[sourceOf(e)];
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/30">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Receipt size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{e.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.category} · {new Date(e.date).toLocaleDateString("fr-FR")}
                      {(e as any).paidBy ? ` · ${(e as any).paidBy}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`hidden sm:inline-flex gap-1 shrink-0 ${meta.cls}`}>{meta.icon}{meta.label}</Badge>
                  {e.hasReceipt && (
                    <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 items-center gap-1 shrink-0">
                      <ImageIcon size={10} /> Justif.
                    </span>
                  )}
                  <p className="font-bold text-sm shrink-0">−{formatFCFA(e.amount)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone: "blue"|"indigo"|"rose"|"amber"; hint?: string }) {
  const tones = {
    blue: "from-white to-blue-50 border-blue-200/70",
    indigo: "from-white to-indigo-50 border-indigo-200/70",
    rose: "from-white to-rose-50 border-rose-200/70",
    amber: "from-white to-amber-50 border-amber-200/70",
  };
  return (
    <Card className={`rounded-2xl bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-5">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider inline-flex items-center gap-1"><Wallet size={11} />{label}</p>
        <p className="font-display font-bold text-xl sm:text-2xl mt-2 tabular-nums truncate">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}
