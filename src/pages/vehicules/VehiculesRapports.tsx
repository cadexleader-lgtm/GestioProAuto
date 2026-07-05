import { useMemo, useState } from "react";
import { useCollection, vehicleProfitability } from "@/lib/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Car, Users, Wallet, Printer, Trophy, Wrench } from "lucide-react";

export function VehiculesRapports() {
  const vehicles = useCollection("vehicles");
  const sales = useCollection("vehicleSales");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentals = useCollection("rentals");
  const maints = useCollection("vehicleMaintenances");
  const [period, setPeriod] = useState<"30" | "90" | "365">("90");

  const cutoff = Date.now() - +period * 86400000;

  const perVehicle = useMemo(() => {
    return vehicles
      .map((v) => ({ v, ...(vehicleProfitability(v.id) || { rentalRevenue: 0, saleRevenue: 0, maintCost: 0, totalCost: 0, profit: 0 }) }))
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, sales, rentals, maints]);

  const totals = useMemo(() => {
    const salesInPeriod = sales.filter((s) => +new Date(s.date) >= cutoff);
    const paymentsInPeriod = payments.filter((p) => +new Date(p.date) >= cutoff);
    const rentalRev = rentals
      .filter((r) => +new Date(r.startDate) >= cutoff)
      .reduce((s, r) => {
        const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
        return s + days * r.dailyRate;
      }, 0);
    const saleRev = salesInPeriod.reduce((s, x) => s + x.amount, 0);
    const creditRev = paymentsInPeriod.reduce((s, p) => s + p.amount, 0);
    const maintCost = maints
      .filter((m) => +new Date(m.dateIn) >= cutoff)
      .reduce((s, m) => s + (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0), 0);
    const outstanding = credits.reduce((s, c) => {
      const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((a, p) => a + p.amount, 0);
      return s + Math.max(0, c.total - paid);
    }, 0);
    return { rentalRev, saleRev, creditRev, maintCost, outstanding, totalRev: rentalRev + saleRev + creditRev };
  }, [sales, rentals, credits, payments, maints, cutoff]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => map.set(s.customer, (map.get(s.customer) || 0) + s.amount));
    rentals.forEach((r) => {
      const days = Math.max(1, Math.round((+new Date(r.endDate) - +new Date(r.startDate)) / 86400000));
      map.set(r.customer, (map.get(r.customer) || 0) + days * r.dailyRate);
    });
    credits.forEach((c) => {
      const paid = c.downPayment + payments.filter((p) => p.creditId === c.id).reduce((a, p) => a + p.amount, 0);
      if (paid > 0) map.set(c.customer, (map.get(c.customer) || 0) + paid);
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [sales, rentals, credits, payments]);

  const revenueSplit = [
    { name: "Ventes", value: totals.saleRev, color: "hsl(220 90% 55%)" },
    { name: "Locations", value: totals.rentalRev, color: "hsl(160 70% 45%)" },
    { name: "Crédits encaissés", value: totals.creditRev, color: "hsl(38 90% 55%)" },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Rapports Auto</h1>
          <p className="text-muted-foreground mt-1">
            Rentabilité par véhicule, meilleurs clients, ventilation des revenus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="30">30 j</TabsTrigger>
              <TabsTrigger value="90">3 mois</TabsTrigger>
              <TabsTrigger value="365">1 an</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => window.print()}>
            <Printer size={16} /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="CA total période" value={formatFCFA(totals.totalRev)} icon={<TrendingUp size={20} />} color="blue" />
        <Kpi label="Revenus locations" value={formatFCFA(totals.rentalRev)} icon={<Car size={20} />} color="emerald" />
        <Kpi label="Encaissements crédit" value={formatFCFA(totals.creditRev)} icon={<Wallet size={20} />} color="amber" />
        <Kpi label="Reste à encaisser" value={formatFCFA(totals.outstanding)} icon={<Wallet size={20} />} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy size={18} /> Top véhicules rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={perVehicle.slice(0, 8).map((r) => ({
                    name: `${r.v.brand} ${r.v.model.split(" ")[0]}`,
                    Profit: r.profit,
                    Coûts: r.totalCost,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="Coûts" fill="hsl(0 70% 60%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Profit" fill="hsl(160 70% 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle>Ventilation des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueSplit.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucun revenu sur cette période.</p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {revenueSplit.map((r, i) => (
                        <Cell key={i} fill={r.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car size={18} /> Fiche de rentabilité par véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left">Véhicule</th>
                    <th className="px-4 py-3 text-right">Coûts</th>
                    <th className="px-4 py-3 text-right">Revenus</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perVehicle.map(({ v, totalCost, saleRevenue, rentalRevenue, maintCost, profit }) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{v.photo}</span>
                          <div>
                            <p className="font-medium">
                              {v.brand} {v.model}
                            </p>
                            <p className="text-xs text-muted-foreground">{v.plate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600">{formatFCFA(totalCost)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {formatFCFA(saleRevenue + rentalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={profit >= 0 ? "secondary" : "destructive"}>
                          {profit >= 0 ? "+" : ""}
                          {formatFCFA(profit)}
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} /> Top clients
            </CardTitle>
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
                    <p className="font-bold text-primary">{formatFCFA(c.amount)}</p>
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

function Kpi({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Card className="shadow-sm rounded-2xl hover:-translate-y-0.5 transition-all">
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-xl ${map[color]} flex items-center justify-center mb-3`}>{icon}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display font-bold text-xl mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
