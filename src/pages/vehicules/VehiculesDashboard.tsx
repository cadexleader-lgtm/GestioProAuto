import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Car, KeyRound, AlertTriangle, ArrowRight, Wrench, Wallet, DollarSign, Users, ArrowDownLeft, ArrowUpRight, Scale, TrendingUp, TrendingDown } from "lucide-react";
import {
  useCollection, vehicleProfitability, rentalContractedAmount,
  signedRevenueInRange, cashFlowInRange, creditOutstandingTotal,
} from "@/lib/demo-store";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRole } from "@/lib/roles";
import { VEHICLE_STATUS } from "@/lib/vehicle-status";

function businessDateKey(value: string | Date) {
  // Date-only values are business dates: preserve them rather than parsing in UTC.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function VehiculesDashboard() {
  const role = useRole();
  const vehicles = useCollection("vehicles");
  const rentals = useCollection("rentals");
  const sales = useCollection("vehicleSales");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentalPayments = useCollection("rentalPayments");
  const cash = useCollection("cash");

  const stats = useMemo(() => {
    const currentMonth = businessDateKey(new Date()).slice(0, 7);
    const isCurrentMonth = (date: string) => businessDateKey(date).slice(0, 7) === currentMonth;

    // Source unique (demo-store.ts) : même calcul que Rapports auto et la
    // rentabilité par véhicule, jamais réimplémenté ici (roadmap item 17).
    const { saleRevenue: saleRevenueMonth, rentalRevenue: rentalRevenueMonth } = signedRevenueInRange(isCurrentMonth);
    const { cashIn: cashInMonth, cashOut: cashOutMonth, net: netCashMonth } = cashFlowInRange(isCurrentMonth);

    // Reconciliation only: these payment records are already represented in cashInMonth.
    const rentalPaymentsMonth = rentalPayments
      .filter((payment) => isCurrentMonth(payment.date))
      .reduce((sum, payment) => sum + payment.amount, 0);

    const creditsRemaining = creditOutstandingTotal();
    const immobilized = vehicles.filter((v) => v.status === "maintenance" || v.status === "rented").length;
    return {
      saleRevenueMonth,
      rentalRevenueMonth,
      rentalPaymentsMonth,
      cashInMonth,
      cashOutMonth,
      netCashMonth,
      creditsRemaining,
      immobilized,
    };
  }, [vehicles, rentals, sales, credits, payments, rentalPayments, cash]);

  // Évolution 6 derniers mois
  const evolution = useMemo(() => {
    const buckets: { month: string; label: string; loc: number; vente: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = businessDateKey(d).slice(0, 7);
      buckets.push({ month: key, label: d.toLocaleDateString("fr-FR", { month: "short" }), loc: 0, vente: 0 });
    }
    rentals.forEach((r) => {
      const key = businessDateKey(r.startDate).slice(0, 7);
      const b = buckets.find((x) => x.month === key);
      if (b) b.loc += rentalContractedAmount(r);
    });
    sales.forEach((s) => {
      const key = businessDateKey(s.date).slice(0, 7);
      const b = buckets.find((x) => x.month === key);
      if (b) b.vente += s.amount;
    });
    return buckets;
  }, [rentals, sales]);

  // Top véhicules rentables
  const topProfitable = useMemo(() => {
    return vehicles
      .map((v) => ({ v, prof: vehicleProfitability(v.id) }))
      .filter((x) => x.prof)
      .sort((a, b) => (b.prof!.profit || 0) - (a.prof!.profit || 0))
      .slice(0, 5);
  }, [vehicles, rentals, sales]);

  // Top clients
  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    rentals.forEach((r) => {
      map.set(r.customer, (map.get(r.customer) || 0) + rentalContractedAmount(r));
    });
    sales.forEach((s) => map.set(s.customer, (map.get(s.customer) || 0) + s.amount));
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [rentals, sales]);

  if (role === "terrain") {
    const available = vehicles.filter((v) => v.status === "available").length;
    const rented = vehicles.filter((v) => v.status === "rented").length;
    const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
    const activeRentals = rentals.filter((r) => r.status === "active").length;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">État du parc automobile.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={<Car className="text-emerald-600" />} label="Disponibles" value={String(available)} tone="emerald" />
          <Kpi icon={<KeyRound className="text-indigo-600" />} label="En location" value={String(rented)} tone="indigo" />
          <Kpi icon={<Wrench className="text-amber-600" />} label="En maintenance" value={String(inMaintenance)} tone="amber" />
          <Kpi icon={<AlertTriangle className="text-cyan-600" />} label="Locations actives" value={String(activeRentals)} tone="cyan" />
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="font-display font-semibold">Alertes maintenance</h3>
              <Link to="/app/auto/maintenance" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                Voir tout <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y border-t">
              {vehicles.filter((v) => v.status === "maintenance" || v.mileageKm > 60_000).slice(0, 4).map((v) => (
                <div key={v.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                  <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0">
                    {v.image ? <img src={v.image} className="w-full h-full rounded object-cover" /> : v.photo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                    <p className="text-xs text-muted-foreground">{v.plate} · {v.mileageKm.toLocaleString("fr-FR")} km</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                    <Wrench size={12} /> {v.status === "maintenance" ? VEHICLE_STATUS.maintenance.label : "Révision conseillée"}
                  </span>
                </div>
              ))}
              {vehicles.filter((v) => v.status === "maintenance" || v.mileageKm > 60_000).length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">Aucune alerte</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tableau de bord — Véhicules</h1>
        <p className="text-muted-foreground mt-1">Ce que le patron regarde en premier.</p>
      </div>

      {/* KPIs prioritaires */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<DollarSign className="text-emerald-600" />} label="CA signé du mois" value={formatFCFA(stats.saleRevenueMonth)} tone="emerald" />
        <Kpi icon={<ArrowDownLeft className="text-blue-600" />} label="Encaissements du mois" value={formatFCFA(stats.cashInMonth)} tone="blue" />
        <Kpi icon={<ArrowUpRight className="text-rose-600" />} label="Décaissements du mois" value={formatFCFA(stats.cashOutMonth)} tone="rose" />
        <Kpi icon={<Scale className="text-indigo-600" />} label="Trésorerie nette du mois" value={formatFCFA(stats.netCashMonth)} tone="indigo" />
        <Kpi icon={<Wallet className="text-violet-600" />} label="Créances en cours" value={formatFCFA(stats.creditsRemaining)} tone="violet" />
        <Kpi icon={<KeyRound className="text-cyan-600" />} label="Locations contractées du mois" value={formatFCFA(stats.rentalRevenueMonth)} tone="cyan" />
        <Kpi icon={<AlertTriangle className="text-amber-600" />} label="Véhicules immobilisés" value={String(stats.immobilized)} tone="amber" />
      </div>

      <p className="text-xs text-muted-foreground">
        Les locations sont rattachées commercialement au mois de leur début. Les paiements de location enregistrés ce mois ({formatFCFA(stats.rentalPaymentsMonth)}) sont déjà inclus dans les encaissements de caisse.
      </p>

      {/* Évolution des revenus */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Évolution du CA signé</h3>
              <p className="text-xs text-muted-foreground">6 derniers mois — ventes signées + contrats de location, sans assimilation à la trésorerie</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--chart-ventes))" }} /> Ventes
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--chart-locations))" }} /> Locations
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <AreaChart data={evolution} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVente" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-ventes))" stopOpacity={0.32} /><stop offset="100%" stopColor="hsl(var(--chart-ventes))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gLoc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-locations))" stopOpacity={0.28} /><stop offset="100%" stopColor="hsl(var(--chart-locations))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--chart-axis))" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "hsl(var(--chart-axis))" }} axisLine={false} tickLine={false} width={42} />
                <Tooltip
                  formatter={(v: number, name) => [formatFCFA(v), name]}
                  contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="vente" name="Ventes" stroke="hsl(var(--chart-ventes))" strokeWidth={2.5} fill="url(#gVente)" />
                <Area type="monotone" dataKey="loc" name="Locations" stroke="hsl(var(--chart-locations))" strokeWidth={2.5} fill="url(#gLoc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top rentables + Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold inline-flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Top véhicules rentables</h3>
              <Link to="/app/auto/vehicules" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-3">
              {topProfitable.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>}
              {topProfitable.map(({ v, prof }, i) => (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="text-2xl">{v.image ? <img src={v.image} className="w-10 h-10 rounded object-cover" /> : v.photo}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{v.brand} {v.model}</p>
                    <p className="text-[11px] text-muted-foreground">{v.plate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${prof!.profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{formatFCFA(prof!.profit)}</p>
                    <p className="text-[10px] text-muted-foreground">bénéfice</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold inline-flex items-center gap-2"><Users size={16} className="text-indigo-600" /> Top clients</h3>
              <Link to="/app/auto/clients" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-3">
              {topCustomers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun client</p>}
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-950/50 dark:to-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatFCFA(c.total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes maintenance */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="font-display font-semibold">Alertes maintenance</h3>
            <Link to="/app/auto/maintenance" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y border-t">
            {vehicles.filter((v) => v.status === "maintenance" || v.mileageKm > 60_000).slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0">
                  {v.image ? <img src={v.image} className="w-full h-full rounded object-cover" /> : v.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.plate} · {v.mileageKm.toLocaleString("fr-FR")} km</p>
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                  <Wrench size={12} /> {v.status === "maintenance" ? VEHICLE_STATUS.maintenance.label : "Révision conseillée"}
                </span>
              </div>
            ))}
            {vehicles.filter((v) => v.status === "maintenance" || v.mileageKm > 60_000).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">Aucune alerte</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "indigo" | "blue" | "violet" | "amber" | "rose" | "cyan" }) {
  const tones = {
    emerald: "from-white to-emerald-50 border-emerald-200/70 dark:from-card dark:to-card dark:border-border",
    indigo: "from-white to-indigo-50 border-indigo-200/70 dark:from-card dark:to-card dark:border-border",
    blue: "from-white to-blue-50 border-blue-200/70 dark:from-card dark:to-card dark:border-border",
    violet: "from-white to-violet-50 border-violet-200/70 dark:from-card dark:to-card dark:border-border",
    amber: "from-white to-amber-50 border-amber-200/70 dark:from-card dark:to-card dark:border-border",
    rose: "from-white to-rose-50 border-rose-200/70 dark:from-card dark:to-card dark:border-border",
    cyan: "from-white to-cyan-50 border-cyan-200/70 dark:from-card dark:to-card dark:border-border",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]} hover:-translate-y-0.5 transition-all`}>
      <CardContent className="p-4">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center mb-2 shadow-sm">{icon}</div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <p className="font-display font-bold text-lg sm:text-xl mt-1 tabular-nums truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
