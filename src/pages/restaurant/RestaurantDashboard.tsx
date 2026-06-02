import {
  useGetRestaurantDashboard,
  useListRestaurantTables,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFCFA } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  ChefHat,
  Grid3x3,
  TrendingUp,
  Timer,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-sky-100 text-sky-700 border-sky-200" },
  cooking: { label: "En cuisine", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ready: { label: "Prêt", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  served: { label: "Servi", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  paid: { label: "Payé", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function RestaurantDashboard() {
  const { data, isLoading } = useGetRestaurantDashboard();
  const { data: tables } = useListRestaurantTables();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
          Tableau de bord — Restaurant
        </h1>
        <p className="text-muted-foreground mt-1">
          Pilotez votre service en temps réel : commandes, cuisine et tables.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<ClipboardList size={22} />}
          label="Commandes du jour"
          value={data.ordersToday.toString()}
          tone="indigo"
        />
        <Kpi
          icon={<TrendingUp size={22} />}
          label="Revenus du jour"
          value={formatFCFA(data.revenueToday)}
          tone="emerald"
        />
        <Kpi
          icon={<Timer size={22} />}
          label="Temps prép. moyen"
          value={`${data.avgPrepMinutes} min`}
          tone="amber"
        />
        <Kpi
          icon={<Grid3x3 size={22} />}
          label="Tables occupées"
          value={`${data.occupiedTables}/${data.totalTables}`}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus de la journée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.hourlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="restoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), "Revenus"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#restoGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500" /> Plats les plus vendus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topDishes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              data.topDishes.map((d, i) => (
                <div key={d.dishId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.dishName}</p>
                    <p className="text-xs text-muted-foreground">{d.quantity} servis</p>
                  </div>
                  <span className="text-sm font-semibold">{formatFCFA(d.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ChefHat size={18} /> Commandes en cours
          </CardTitle>
          <Link
            to="/app/resto/commandes"
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Tout voir <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-semibold">Référence</th>
                  <th className="px-6 py-3 text-left font-semibold">Table</th>
                  <th className="px-6 py-3 text-left font-semibold">Serveur</th>
                  <th className="px-6 py-3 text-left font-semibold">Plats</th>
                  <th className="px-6 py-3 text-right font-semibold">Total</th>
                  <th className="px-6 py-3 text-left font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      Aucune commande active.
                    </td>
                  </tr>
                ) : (
                  data.activeOrders.map((o) => {
                    const s = STATUS_LABEL[o.status];
                    return (
                      <tr key={o.id} className="hover:bg-muted/30">
                        <td className="px-6 py-3 font-medium">{o.reference}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold">
                            {o.tableNumber}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{o.server}</td>
                        <td className="px-6 py-3 text-muted-foreground truncate max-w-[200px]">
                          {o.items.map((it) => `${it.quantity}× ${it.dishName}`).join(", ")}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold">{formatFCFA(o.total)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TONE: Record<string, string> = {
  indigo: "from-white to-indigo-50/60 border-indigo-200/60 text-indigo-600",
  emerald: "from-white to-emerald-50/60 border-emerald-200/60 text-emerald-600",
  amber: "from-white to-amber-50/60 border-amber-200/60 text-amber-600",
  rose: "from-white to-rose-50/60 border-rose-200/60 text-rose-600",
};

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: keyof typeof TONE }) {
  return (
    <Card className={`bg-gradient-to-br ${TONE[tone]} hover:-translate-y-0.5 transition`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 border">
            {icon}
          </div>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display font-bold text-xl sm:text-2xl text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
