import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Car, TrendingUp, KeyRound, AlertTriangle, ArrowRight, Wrench } from "lucide-react";
import { vehicles, vehicleMargin, vehicleCost, rentals, vehicleCredits } from "@/lib/demo-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function VehiculesDashboard() {
  const available = vehicles.filter(v => v.status === "available").length;
  const sold = vehicles.filter(v => v.status === "sold");
  const totalRevenue = sold.reduce((s, v) => s + v.sellingPrice, 0);
  const totalMargin = sold.reduce((s, v) => s + vehicleMargin(v), 0);
  const activeRentals = rentals.filter(r => r.status === "active").length;
  const lateCredits = vehicleCredits.filter(c => c.status === "late").length;

  const byBrand = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.brand] = (acc[v.brand] || 0) + 1; return acc;
  }, {});
  const brandData = Object.entries(byBrand).map(([brand, count]) => ({ brand, count }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tableau de bord — Véhicules</h1>
        <p className="text-muted-foreground mt-1">Pilotez votre parc automobile, vos ventes et locations.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Car className="text-blue-600" />} label="Véhicules en stock" value={available.toString()} tone="blue" />
        <Kpi icon={<TrendingUp className="text-emerald-600" />} label="CA véhicules vendus" value={formatFCFA(totalRevenue)} tone="emerald" />
        <Kpi icon={<KeyRound className="text-indigo-600" />} label="Locations actives" value={activeRentals.toString()} tone="indigo" />
        <Kpi icon={<AlertTriangle className="text-rose-600" />} label="Crédits en retard" value={lateCredits.toString()} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold">Marges par véhicule vendu</h3>
                <p className="text-xs text-muted-foreground">Marge nette = prix vente − (achat + frais)</p>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1">Bénéfice {formatFCFA(totalMargin)}</span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={sold.map(v => ({ name: `${v.brand} ${v.year}`, marge: vehicleMargin(v), cout: vehicleCost(v) }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v/1_000_000}M`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="cout" fill="hsl(var(--muted))" radius={[4,4,0,0]} />
                  <Bar dataKey="marge" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold mb-4">Parc par marque</h3>
            <div className="space-y-3">
              {brandData.map(b => (
                <div key={b.brand}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{b.brand}</span>
                    <span className="text-muted-foreground">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(b.count / vehicles.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="font-display font-semibold">Alertes maintenance</h3>
            <Link to="/app/auto/vehicules" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              Voir le parc <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y border-t">
            {vehicles.filter(v => v.status === "maintenance" || v.mileageKm > 60_000).slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-2xl shrink-0">
                  {v.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.plate} · {v.mileageKm.toLocaleString("fr-FR")} km</p>
                </div>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                  <Wrench size={12} /> Révision conseillée
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue"|"emerald"|"indigo"|"rose" }) {
  const tones = {
    blue: "bg-gradient-to-br from-white to-blue-50 border-blue-200/70",
    emerald: "bg-gradient-to-br from-white to-emerald-50 border-emerald-200/70",
    indigo: "bg-gradient-to-br from-white to-indigo-50 border-indigo-200/70",
    rose: "bg-gradient-to-br from-white to-rose-50 border-rose-200/70",
  };
  return (
    <Card className={`${tones[tone]} hover:-translate-y-0.5 transition-all`}>
      <CardContent className="p-5">
        <div className="w-10 h-10 rounded-xl bg-white border border-current/10 flex items-center justify-center mb-3">{icon}</div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="font-display font-bold text-xl mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
