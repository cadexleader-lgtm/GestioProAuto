import { useMemo, useState } from "react";
import {
  useCollection, vehicleProfitability, rentalContractedAmount,
  signedRevenueInRange, creditPaymentsInRange, creditOutstandingTotal,
} from "@/lib/demo-store";
import { pdfReport } from "@/lib/pdf/templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Car, KeyRound, Users, Wallet, Download, Trophy, Wrench } from "lucide-react";
import { toast } from "sonner";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { useFeatureFlags } from "@/lib/feature-flags";

/**
 * Palette — validée colorblind-safe (skill dataviz), source unique partagée
 * via des variables CSS (styles.css) avec un jeu de valeurs dédié au thème
 * sombre — une couleur = un seul sens, sur toute l'app, dans les deux thèmes.
 */
const COLOR = {
  ventes: "hsl(var(--chart-ventes))",
  locations: "hsl(var(--chart-locations))",
  profit: "hsl(var(--chart-profit))",
  cout: "hsl(var(--chart-cout))",
  grid: "hsl(var(--chart-grid))",
  axis: "hsl(var(--chart-axis))",
};

const PERIODS = { "30": "30 derniers jours", "90": "3 derniers mois", "365": "12 derniers mois" } as const;
type Period = keyof typeof PERIODS;

export function VehiculesRapports() {
  const flags = useFeatureFlags();
  const vehicles = useCollection("vehicles");
  const sales = useCollection("vehicleSales");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentals = useCollection("rentals");
  const maints = useCollection("vehicleMaintenances");
  const [period, setPeriod] = useState<Period>("90");
  const [exporting, setExporting] = useState(false);

  const periodMs = +period * 86400000;
  const cutoff = Date.now() - periodMs;
  const prevCutoff = cutoff - periodMs;

  const perVehicle = useMemo(() => {
    return vehicles
      .map((v) => ({ v, ...(vehicleProfitability(v.id) || { rentalRevenue: 0, saleRevenue: 0, maintCost: 0, totalCost: 0, profit: 0 }) }))
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, sales, rentals, maints]);

  const totals = useMemo(() => {
    const inPeriod = (iso: string) => +new Date(iso) >= cutoff;
    const inPrevPeriod = (iso: string) => { const t = +new Date(iso); return t >= prevCutoff && t < cutoff; };

    // Source unique (demo-store.ts) : le CA "vente" inclut déjà le montant plein
    // des ventes à crédit signées sur la période. Les paiements d'échéance reçus
    // (creditRev ci-dessous) sont un indicateur de trésorerie séparé — les
    // additionner à saleRev double-compterait la même vente à crédit deux fois.
    const current = signedRevenueInRange(inPeriod);
    const previous = signedRevenueInRange(inPrevPeriod);
    const creditRev = creditPaymentsInRange(inPeriod);
    const maintCost = maints
      .filter((m) => +new Date(m.dateIn) >= cutoff)
      .reduce((s, m) => s + (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0), 0);
    const outstanding = creditOutstandingTotal();

    const deltaPct = (curr: number, prev: number): number | null =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? null : 0;

    return {
      ...current, creditRev, maintCost, outstanding,
      deltaTotal: deltaPct(current.total, previous.total),
      deltaSale: deltaPct(current.saleRevenue, previous.saleRevenue),
      deltaRental: deltaPct(current.rentalRevenue, previous.rentalRevenue),
    };
  }, [sales, rentals, credits, payments, maints, cutoff, prevCutoff]);

  // Évolution du CA signé sur la période — granularité adaptée (jour/semaine/mois)
  // pour que le graphe reste lisible quelle que soit la fenêtre choisie.
  const evolution = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    type Bucket = { start: number; end: number; label: string; ca: number };
    const buckets: Bucket[] = [];

    if (period === "30") {
      for (let i = 29; i >= 0; i--) {
        const start = new Date(now); start.setDate(start.getDate() - i);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        buckets.push({ start: +start, end: +end, label: `${start.getDate()}/${start.getMonth() + 1}`, ca: 0 });
      }
    } else if (period === "90") {
      for (let i = 12; i >= 0; i--) {
        const start = new Date(now); start.setDate(start.getDate() - i * 7);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        buckets.push({ start: +start, end: +end, label: `${start.getDate()}/${start.getMonth() + 1}`, ca: 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        buckets.push({ start: +start, end: +end, label: start.toLocaleDateString("fr-FR", { month: "short" }), ca: 0 });
      }
    }

    const place = (iso: string, amount: number) => {
      const t = +new Date(iso);
      const b = buckets.find((x) => t >= x.start && t < x.end);
      if (b) b.ca += amount;
    };
    sales.filter((s) => +new Date(s.date) >= cutoff).forEach((s) => place(s.date, s.amount));
    rentals.filter((r) => +new Date(r.startDate) >= cutoff).forEach((r) => place(r.startDate, rentalContractedAmount(r)));

    return buckets.map((b) => ({ label: b.label, ca: b.ca }));
  }, [sales, rentals, period, cutoff]);

  const topClients = useMemo(() => {
    // Chaque vente à crédit a déjà une ligne vehicleSales au montant plein — ne
    // pas réadditionner les paiements de vehicleCredits par-dessus (même bug que
    // totals ci-dessus, corrigé ici aussi).
    const map = new Map<string, number>();
    sales.forEach((s) => map.set(s.customer, (map.get(s.customer) || 0) + s.amount));
    rentals.forEach((r) => {
      map.set(r.customer, (map.get(r.customer) || 0) + rentalContractedAmount(r));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [sales, rentals, credits, payments]);

  const splitTotal = totals.saleRevenue + totals.rentalRevenue;
  const sellPct = splitTotal > 0 ? Math.round((totals.saleRevenue / splitTotal) * 100) : 0;
  const rentPct = 100 - sellPct;

  const exportPdf = () => {
    if (exporting) return;
    setExporting(true);
    try {
      pdfReport({
        title: "Rapport Auto",
        period: PERIODS[period],
        sections: [
          {
            title: "Résumé financier",
            kpis: [
              { label: "CA signé", value: formatFCFA(totals.total) },
              { label: "Ventes", value: formatFCFA(totals.saleRevenue) },
              { label: "Locations", value: formatFCFA(totals.rentalRevenue) },
              { label: "Encaissements crédit", value: formatFCFA(totals.creditRev) },
              { label: "Reste à encaisser (total)", value: formatFCFA(totals.outstanding) },
              { label: "Coûts maintenance", value: formatFCFA(totals.maintCost) },
            ],
          },
          {
            title: "Top véhicules rentables",
            columns: [
              { header: "Véhicule", width: 70 },
              { header: "Coûts", width: 45, align: "right" },
              { header: "Revenus", width: 45, align: "right" },
              { header: "Profit", width: 40, align: "right" },
            ],
            rows: perVehicle.slice(0, 15).map(({ v, totalCost, saleRevenue, rentalRevenue, profit }) => [
              `${v.brand} ${v.model} (${v.plate})`,
              formatFCFA(totalCost),
              formatFCFA(saleRevenue + rentalRevenue),
              formatFCFA(profit),
            ]),
          },
          {
            title: "Meilleurs clients",
            columns: [
              { header: "Client", width: 110 },
              { header: "Montant", width: 60, align: "right" },
            ],
            rows: topClients.map((c) => [c.name, formatFCFA(c.amount)]),
          },
        ],
      });
      toast.success("Rapport PDF généré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le rapport n'a pas pu être généré.");
    } finally {
      setExporting(false);
    }
  };

  if (!flags.reports) {
    return <RestrictedAccess title="Rapports" message="Ce module est désactivé pour votre entreprise. Un patron peut le réactiver dans Paramètres." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Rapports Auto</h1>
          <p className="text-muted-foreground mt-1">
            CA signé, rentabilité par véhicule, meilleurs clients — {PERIODS[period].toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="30">30 j</TabsTrigger>
              <TabsTrigger value="90">3 mois</TabsTrigger>
              <TabsTrigger value="365">1 an</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" className="rounded-xl gap-2" onClick={exportPdf} disabled={exporting}>
            <Download size={16} /> {exporting ? "Génération..." : "Exporter en PDF"}
          </Button>
        </div>
      </div>

      {/* KPIs — 4 chiffres qui comptent, avec évolution vs période précédente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="CA signé" value={formatFCFA(totals.total)} delta={totals.deltaTotal} icon={<TrendingUp size={18} />} />
        <Kpi label="Ventes" value={formatFCFA(totals.saleRevenue)} delta={totals.deltaSale} icon={<Car size={18} />} dot={COLOR.ventes} />
        <Kpi label="Locations" value={formatFCFA(totals.rentalRevenue)} delta={totals.deltaRental} icon={<KeyRound size={18} />} dot={COLOR.locations} />
        <Kpi label="Reste à encaisser" value={formatFCFA(totals.outstanding)} icon={<Wallet size={18} />} muted />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Encaissements crédit sur la période : <strong className="text-foreground">{formatFCFA(totals.creditRev)}</strong>
        {" "}— déjà compris dans le CA signé au moment de la vente, affiché ici à titre de trésorerie uniquement.
      </p>

      {/* Évolution du CA signé */}
      <Card className="shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Évolution du CA signé</CardTitle>
        </CardHeader>
        <CardContent>
          {evolution.every((b) => b.ca === 0) ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
              <TrendingUp size={22} className="opacity-40" />
              <p className="text-sm font-medium">Aucun CA sur cette période</p>
              <p className="text-xs">Les ventes et locations signées s'afficheront ici.</p>
            </div>
          ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.ventes} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={COLOR.ventes} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={COLOR.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLOR.axis }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLOR.axis }} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} width={44} />
                <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="ca" name="CA signé" stroke={COLOR.ventes} strokeWidth={2} fill="url(#caGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy size={17} className="text-muted-foreground" /> Top véhicules rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perVehicle.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
                <Trophy size={22} className="opacity-40" />
                <p className="text-sm font-medium">Aucun véhicule</p>
                <p className="text-xs">La rentabilité par véhicule s'affichera ici.</p>
              </div>
            ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={perVehicle.slice(0, 8).map((r) => ({
                    name: `${r.v.brand} ${r.v.model.split(" ")[0]}`,
                    Profit: r.profit,
                    Coûts: r.totalCost,
                  }))}
                  barGap={2}
                  margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke={COLOR.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLOR.axis }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} tick={{ fontSize: 11, fill: COLOR.axis }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Coûts" fill={COLOR.cout} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Profit" fill={COLOR.profit} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Répartition du CA signé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {splitTotal === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Aucun revenu sur cette période.</p>
            ) : (
              <>
                <div className="flex h-7 rounded-lg overflow-hidden">
                  <div style={{ width: `${sellPct}%`, background: COLOR.ventes }} title={`Ventes ${sellPct}%`} />
                  {sellPct > 0 && rentPct > 0 && <div className="w-0.5 bg-background shrink-0" />}
                  <div style={{ width: `${rentPct}%`, background: COLOR.locations }} title={`Locations ${rentPct}%`} />
                </div>
                <div className="space-y-3">
                  <SplitRow color={COLOR.ventes} label="Ventes" value={formatFCFA(totals.saleRevenue)} pct={sellPct} />
                  <SplitRow color={COLOR.locations} label="Locations" value={formatFCFA(totals.rentalRevenue)} pct={rentPct} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Car size={17} className="text-muted-foreground" /> Rentabilité par véhicule
            </CardTitle>
            <p className="text-xs text-muted-foreground">Cumulée depuis l'acquisition — non filtrée par période.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left font-semibold">Véhicule</th>
                    <th className="px-4 py-3 text-right font-semibold">Coûts</th>
                    <th className="px-4 py-3 text-right font-semibold">Revenus</th>
                    <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perVehicle.map(({ v, totalCost, saleRevenue, rentalRevenue, maintCost, profit }) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{v.photo}</span>
                          <div>
                            <p className="font-medium">{v.brand} {v.model}</p>
                            <p className="text-xs text-muted-foreground">{v.plate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: COLOR.cout }}>{formatFCFA(totalCost)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatFCFA(saleRevenue + rentalRevenue)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={profit >= 0 ? "secondary" : "destructive"} className="tabular-nums">
                          {profit >= 0 ? "+" : ""}{formatFCFA(profit)}
                        </Badge>
                        {maintCost > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            <Wrench size={9} className="inline" /> {formatFCFA(maintCost)} maintenance
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users size={17} className="text-muted-foreground" /> Meilleurs clients
            </CardTitle>
            <p className="text-xs text-muted-foreground">Toutes périodes confondues.</p>
          </CardHeader>
          <CardContent className="p-0">
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucun client.</p>
            ) : (
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3 px-6 py-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <p className="flex-1 font-medium truncate">{c.name}</p>
                    <p className="font-bold text-foreground tabular-nums">{formatFCFA(c.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, icon, dot, muted }: {
  label: string; value: string; delta?: number | null; icon: React.ReactNode; dot?: string; muted?: boolean;
}) {
  return (
    <Card className="shadow-sm rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
          {typeof delta === "number" && <DeltaBadge value={delta} />}
        </div>
        <p className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1.5">
          {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
          {label}
        </p>
        <p className="font-display font-bold text-xl mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground"><Minus size={11} /> 0%</span>;
  }
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-700" : "text-rose-700"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {up ? "+" : ""}{value}%
    </span>
  );
}

function SplitRow({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{pct}%</span>
    </div>
  );
}
