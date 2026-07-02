import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Car, TrendingUp, KeyRound, AlertTriangle, ArrowRight, Wrench, Wallet, DollarSign, Users } from "lucide-react";
import { useCollection, vehicleProfitability } from "@/lib/demo-store";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function VehiculesDashboard() {
  const vehicles = useCollection("vehicles");
  const rentals = useCollection("rentals");
  const sales = useCollection("vehicleSales");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");

  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = (d: string | Date) => new Date(d).toISOString().slice(0, 7);
    const currentMonth = now.toISOString().slice(0, 7);

    // Revenus location : cumul (jours × tarif) des locations
    const rentalRevenue = rentals.reduce((s, r) => {
      const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
      return s + days * (r.dailyRate || 0);
    }, 0);
    const rentalRevenueMonth = rentals
      .filter((r) => monthKey(r.startDate) === currentMonth)
      .reduce((s, r) => {
        const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
        return s + days * (r.dailyRate || 0);
      }, 0);

    // Revenus vente
    const saleRevenue = sales.reduce((s, x) => s + x.amount, 0);
    const saleRevenueMonth = sales.filter((s) => monthKey(s.date) === currentMonth).reduce((a, b) => a + b.amount, 0);

    // Crédits restant à encaisser
    const creditsRemaining = credits.reduce((s, c) => {
      const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((x, p) => x + p.amount, 0);
      return s + Math.max(0, c.total - paid);
    }, 0);

    const immobilized = vehicles.filter((v) => v.status === "maintenance" || v.status === "rented").length;
    const monthTotal = rentalRevenueMonth + saleRevenueMonth;

    return { rentalRevenue, saleRevenue, creditsRemaining, immobilized, monthTotal };
  }, [vehicles, rentals, sales, credits, payments]);

  // Évolution 6 derniers mois
  const evolution = useMemo(() => {
    const buckets: { month: string; label: string; loc: number; vente: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      buckets.push({ month: key, label: d.toLocaleDateString("fr-FR", { month: "short" }), loc: 0, vente: 0 });
    }
    rentals.forEach((r) => {
      const key = new Date(r.startDate).toISOString().slice(0, 7);
      const b = buckets.find((x) => x.month === key);
      if (b) {
        const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
        b.loc += days * (r.dailyRate || 0);
      }
    });
    sales.forEach((s) => {
      const key = new Date(s.date).toISOString().slice(0, 7);
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
      const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
      map.set(r.customer, (map.get(r.customer) || 0) + days * (r.dailyRate || 0));
    });
    sales.forEach((s) => map.set(s.customer, (map.get(s.customer) || 0) + s.amount));
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [rentals, sales]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tableau de bord — Véhicules</h1>
        <p className="text-muted-foreground mt-1">Ce que le patron regarde en premier.</p>
      </div>

      {/* KPIs prioritaires */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<DollarSign className="text-emerald-600" />} label="CA du mois" value={formatFCFA(stats.monthTotal)} tone="emerald" />
        <Kpi icon={<KeyRound className="text-indigo-600" />} label="Revenus location" value={formatFCFA(stats.rentalRevenue)} tone="indigo" />
        <Kpi icon={<TrendingUp className="text-blue-600" />} label="Revenus vente" value={formatFCFA(stats.saleRevenue)} tone="blue" />
        <Kpi icon={<Wallet className="text-violet-600" />} label="Crédit restant" value={formatFCFA(stats.creditsRemaining)} tone="violet" />
        <Kpi icon={<AlertTriangle className="text-amber-600" />} label="Véhicules immobilisés" value={String(stats.immobilized)} tone="amber" />
      </div>

      {/* Évolution des revenus */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Évolution des revenus</h3>
              <p className="text-xs text-muted-foreground">6 derniers mois — location + vente</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <AreaChart data={evolution}>
                <defs>
                  <linearGradient id="gLoc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gVente" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="loc" name="Location" stroke="hsl(var(--primary))" fill="url(#gLoc)" strokeWidth={2} />
                <Area type="monotone" dataKey="vente" name="Vente" stroke="#10b981" fill="url(#gVente)" strokeWidth={2} />
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
                    <p className={`text-sm font-bold ${prof!.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatFCFA(prof!.profit)}</p>
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
              <Link to="/app/clients" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-3">
              {topCustomers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucun client</p>}
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-sm">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">{formatFCFA(c.total)}</p>
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
                <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-2xl shrink-0">
                  {v.image ? <img src={v.image} className="w-full h-full rounded object-cover" /> : v.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.plate} · {v.mileageKm.toLocaleString("fr-FR")} km</p>
                </div>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                  <Wrench size={12} /> {v.status === "maintenance" ? "En atelier" : "Révision conseillée"}
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

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "indigo" | "blue" | "violet" | "amber" }) {
  const tones = {
    emerald: "from-white to-emerald-50 border-emerald-200/70",
    indigo: "from-white to-indigo-50 border-indigo-200/70",
    blue: "from-white to-blue-50 border-blue-200/70",
    violet: "from-white to-violet-50 border-violet-200/70",
    amber: "from-white to-amber-50 border-amber-200/70",
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
