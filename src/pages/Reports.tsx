import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFCFA, formatMoneyAuto, formatDate } from "@/lib/format";
import { useCollection } from "@/lib/demo-store";
import { pdfReport } from "@/lib/pdf/templates";
import { RevenueEvolutionChart } from "@/components/analytics/RevenueEvolutionChart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  FileDown, TrendingUp, ShoppingCart, Target, Car, KeyRound, Wallet, Receipt,
} from "lucide-react";
import { toast } from "sonner";

type Period = "day" | "week" | "month" | "year";

const PERIOD_LABEL: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "7 derniers jours",
  month: "30 derniers jours",
  year: "12 derniers mois",
};

function periodStart(p: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - 6);
  if (p === "month") d.setDate(d.getDate() - 29);
  if (p === "year") d.setMonth(d.getMonth() - 11);
  return d;
}

const PIE_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#6366f1", "#f43f5e", "#0ea5e9"];

export function Reports() {
  const [period, setPeriod] = useState<Period>("week");

  const sales = useCollection("sales");
  const vehicleSales = useCollection("vehicleSales");
  const rentals = useCollection("rentals");
  const expenses = useCollection("expenses");
  const products = useCollection("products");
  const customers = useCollection("customers");
  const vehicles = useCollection("vehicles");
  const payments = useCollection("vehiclePayments");

  const stats = useMemo(() => {
    const from = periodStart(period).getTime();
    const inRange = (iso?: string) => !!iso && new Date(iso).getTime() >= from;

    const s = sales.filter((x) => inRange(x.createdAt));
    const vs = vehicleSales.filter((x) => inRange(x.date));
    const rt = rentals.filter((x) => inRange(x.startDate));
    const ex = expenses.filter((x) => inRange(x.date));
    const pay = payments.filter((x: any) => inRange(x.date));

    const caBoutique = s.reduce((a, x) => a + (x.total || 0), 0);
    const caVehicules = vs.reduce((a, x) => a + (x.amount || 0), 0);
    const caLocations = rt.reduce(
      (a, x) => a + (x.totalAmount ?? (x.dailyRate || 0)),
      0,
    );
    const caCredits = pay.reduce((a: number, x: any) => a + (x.amount || 0), 0);
    const totalDepenses = ex.reduce((a, x) => a + (x.amount || 0), 0);

    // Marge boutique = prix - coût sur les lignes vendues
    const costOf = (pid: string) => products.find((p) => p.id === pid)?.cost ?? 0;
    const margeBoutique = s.reduce(
      (a, x) =>
        a +
        (x.items?.reduce(
          (b, it) => b + (it.unitPrice - costOf(it.productId)) * it.quantity,
          0,
        ) ?? 0),
      0,
    );

    const ca = caBoutique + caVehicules + caLocations;
    const benefice = margeBoutique + caVehicules + caLocations - totalDepenses;

    // Top produits
    const map = new Map<string, { name: string; qty: number; ca: number }>();
    for (const sale of s) {
      for (const it of sale.items ?? []) {
        const e = map.get(it.productId) ?? { name: it.productName, qty: 0, ca: 0 };
        e.qty += it.quantity;
        e.ca += it.quantity * it.unitPrice;
        map.set(it.productId, e);
      }
    }
    const topProducts = [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 8);

    // Top clients (boutique + véhicules)
    const cmap = new Map<string, number>();
    for (const sale of s) {
      const name = customers.find((c) => c.id === sale.customerId)?.name ?? "Client comptoir";
      cmap.set(name, (cmap.get(name) ?? 0) + (sale.total || 0));
    }
    for (const v of vs) cmap.set(v.customer, (cmap.get(v.customer) ?? 0) + (v.amount || 0));
    const topCustomers = [...cmap.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // Dépenses par catégorie
    const emap = new Map<string, number>();
    for (const e of ex) emap.set(e.category, (emap.get(e.category) ?? 0) + e.amount);
    const expenseByCat = [...emap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const revenueMix = [
      { name: "Boutique", value: caBoutique },
      { name: "Véhicules", value: caVehicules },
      { name: "Locations", value: caLocations },
      { name: "Crédits encaissés", value: caCredits },
    ].filter((x) => x.value > 0);

    return {
      ca, caBoutique, caVehicules, caLocations, caCredits,
      totalDepenses, benefice, margeBoutique,
      nbVentes: s.length, nbVehicules: vs.length, nbLocations: rt.length,
      panierMoyen: s.length ? caBoutique / s.length : 0,
      topProducts, topCustomers, expenseByCat, revenueMix,
      salesList: s, vehicleSalesList: vs, rentalsList: rt,
    };
  }, [period, sales, vehicleSales, rentals, expenses, products, customers, payments]);

  const exportPdf = () => {
    try {
      pdfReport({
        title: "Rapport d'activité",
        period: PERIOD_LABEL[period],
        sections: [
          {
            title: "Synthèse",
            kpis: [
              { label: "Chiffre d'affaires", value: formatFCFA(stats.ca) },
              { label: "Dépenses", value: formatFCFA(stats.totalDepenses) },
              { label: "Bénéfice estimé", value: formatFCFA(stats.benefice) },
              { label: "Ventes boutique", value: String(stats.nbVentes) },
              { label: "Véhicules vendus", value: String(stats.nbVehicules) },
              { label: "Locations", value: String(stats.nbLocations) },
            ],
          },
          {
            title: "Répartition du chiffre d'affaires",
            columns: [
              { header: "Source", width: 110 },
              { header: "Montant", width: 70, align: "right" },
            ],
            rows: [
              ["Boutique", formatFCFA(stats.caBoutique)],
              ["Vente véhicules", formatFCFA(stats.caVehicules)],
              ["Locations", formatFCFA(stats.caLocations)],
              ["Encaissements crédits", formatFCFA(stats.caCredits)],
            ],
            totals: [{ label: "Total CA", value: formatFCFA(stats.ca) }],
          },
          {
            title: "Meilleurs produits",
            columns: [
              { header: "Produit", width: 90 },
              { header: "Qté", width: 30, align: "right" },
              { header: "CA", width: 60, align: "right" },
            ],
            rows: stats.topProducts.map((p) => [p.name, String(p.qty), formatFCFA(p.ca)]),
          },
          {
            title: "Meilleurs clients",
            columns: [
              { header: "Client", width: 110 },
              { header: "Total", width: 70, align: "right" },
            ],
            rows: stats.topCustomers.map((c) => [c.name, formatFCFA(c.total)]),
          },
          {
            title: "Dépenses par catégorie",
            columns: [
              { header: "Catégorie", width: 110 },
              { header: "Montant", width: 70, align: "right" },
            ],
            rows: stats.expenseByCat.map((e) => [e.name, formatFCFA(e.value)]),
            totals: [{ label: "Total dépenses", value: formatFCFA(stats.totalDepenses) }],
          },
        ],
      });
      toast.success("Rapport PDF généré");
    } catch {
      toast.error("Impossible de générer le PDF");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Performance consolidée · {PERIOD_LABEL[period]}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid grid-cols-4 w-full sm:w-[380px]">
              <TabsTrigger value="day">Jour</TabsTrigger>
              <TabsTrigger value="week">7 j</TabsTrigger>
              <TabsTrigger value="month">30 j</TabsTrigger>
              <TabsTrigger value="year">12 mois</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={exportPdf} className="gap-2 shadow-sm">
            <FileDown size={16} /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi title="Chiffre d'affaires" value={formatMoneyAuto(stats.ca)} icon={<TrendingUp size={20} />} tone="primary" hint={`${stats.nbVentes} ventes boutique`} />
        <Kpi title="Bénéfice estimé" value={formatMoneyAuto(stats.benefice)} icon={<Target size={20} />} tone={stats.benefice >= 0 ? "emerald" : "rose"} hint={`Marge boutique ${formatMoneyAuto(stats.margeBoutique)}`} />
        <Kpi title="Dépenses" value={formatMoneyAuto(stats.totalDepenses)} icon={<Receipt size={20} />} tone="rose" hint={`${stats.expenseByCat.length} catégories`} />
        <Kpi title="Panier moyen" value={formatMoneyAuto(stats.panierMoyen)} icon={<ShoppingCart size={20} />} tone="indigo" hint="Boutique" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Mini icon={<ShoppingCart size={14} />} label="Ventes boutique" value={formatMoneyAuto(stats.caBoutique)} />
        <Mini icon={<Car size={14} />} label="Vente véhicules" value={formatMoneyAuto(stats.caVehicules)} />
        <Mini icon={<KeyRound size={14} />} label="Locations" value={formatMoneyAuto(stats.caLocations)} />
        <Mini icon={<Wallet size={14} />} label="Crédits encaissés" value={formatMoneyAuto(stats.caCredits)} />
      </div>

      <RevenueEvolutionChart title="Évolution CA vs Dépenses" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Meilleurs produits</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <Empty label="Aucune vente sur la période" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="ca" name="CA" radius={[0, 6, 6, 0]}>
                      {stats.topProducts.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Mix de revenus</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenueMix.length === 0 ? (
              <Empty label="Aucun revenu sur la période" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.revenueMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {stats.revenueMix.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Meilleurs clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topCustomers.length === 0 ? (
              <div className="p-6"><Empty label="Aucun client sur la période" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {stats.topCustomers.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-7 w-7 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                      {formatMoneyAuto(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.expenseByCat.length === 0 ? (
              <div className="p-6"><Empty label="Aucune dépense sur la période" /></div>
            ) : (
              <ul className="divide-y divide-border">
                {stats.expenseByCat.map((e) => {
                  const pct = stats.totalDepenses ? (e.value / stats.totalDepenses) * 100 : 0;
                  return (
                    <li key={e.name} className="px-4 sm:px-5 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{e.name}</span>
                        <span className="tabular-nums font-semibold shrink-0">{formatMoneyAuto(e.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-rose-500/70" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-y border-border">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Détail</th>
                  <th className="px-4 py-3 font-semibold text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {(() => {
                  const vehName = (id: string) => {
                    const v = vehicles.find((x) => x.id === id);
                    return v ? `${v.brand} ${v.model}` : "Véhicule";
                  };
                  const rows = [
                    ...stats.salesList.map((s) => ({
                      date: s.createdAt, type: "Boutique",
                      detail: s.reference || (s.items?.map((i) => i.productName).join(", ") ?? "Vente"),
                      amount: s.total,
                    })),
                    ...stats.vehicleSalesList.map((v) => ({
                      date: v.date, type: "Véhicule",
                      detail: `${vehName(v.vehicleId)} — ${v.customer}`,
                      amount: v.amount,
                    })),
                    ...stats.rentalsList.map((r) => ({
                      date: r.startDate, type: "Location",
                      detail: `${vehName(r.vehicleId)} — ${r.customer}`,
                      amount: r.totalAmount ?? r.dailyRate,
                    })),
                  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 12);

                  if (!rows.length) {
                    return (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Aucune transaction sur la période</td></tr>
                    );
                  }
                  return rows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(r.date, "dd MMM")}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="font-medium">{r.type}</Badge></td>
                      <td className="px-4 py-3 truncate max-w-[240px]">{r.detail}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">{formatMoneyAuto(r.amount)}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, icon, tone, hint }: { title: string; value: string; icon: React.ReactNode; tone: "primary" | "emerald" | "rose" | "indigo"; hint?: string }) {
  const cls = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    indigo: "text-indigo-600 bg-indigo-500/10",
  }[tone];
  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4 sm:p-5">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${cls}`}>{icon}</div>
        <h3 className="text-muted-foreground text-xs sm:text-sm font-medium mt-3 truncate">{title}</h3>
        <p className="font-display font-bold text-xl sm:text-2xl mt-0.5 tabular-nums truncate">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}<span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 font-display font-bold text-sm sm:text-base tabular-nums truncate">{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="h-[260px] grid place-items-center text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
