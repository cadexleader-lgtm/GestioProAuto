import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, ArrowRight, Package } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";

export function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Voici le résumé de votre activité aujourd'hui.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Ventes du jour" 
          value={dashboard.todaySalesCount.toString()} 
          trend={`${dashboard.salesDeltaPct > 0 ? '+' : ''}${dashboard.salesDeltaPct}%`} 
          trendUp={dashboard.salesDeltaPct >= 0} 
          icon={<ShoppingCart size={22} className="text-primary" />}
          tone="blue"
        />
        <KpiCard 
          title="Revenus" 
          value={formatFCFA(dashboard.todayRevenue)} 
          trend={`${dashboard.revenueDeltaPct > 0 ? '+' : ''}${dashboard.revenueDeltaPct}%`} 
          trendUp={dashboard.revenueDeltaPct >= 0} 
          icon={<TrendingUp size={22} className="text-emerald-600" />}
          tone="emerald"
        />
        <KpiCard 
          title="Marge nette" 
          value={`${dashboard.todayMarginPct.toFixed(1)}%`} 
          trend="" 
          trendUp={true} 
          icon={<CheckCircle2 size={22} className="text-indigo-600" />}
          tone="indigo"
        />
        <KpiCard 
          title="Alertes stock" 
          value={dashboard.lowStock.length.toString()} 
          trend={dashboard.lowStock.length > 0 ? "Urgent" : "OK"} 
          trendUp={dashboard.lowStock.length === 0} 
          icon={<AlertTriangle size={22} className={dashboard.lowStock.length > 0 ? "text-destructive" : "text-muted-foreground"} />}
          tone={dashboard.lowStock.length > 0 ? "rose" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Revenus (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.weekSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('fr-FR', { weekday: 'short' })} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [formatFCFA(value), "Revenus"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Alertes rupture</CardTitle>
            {dashboard.lowStock.length > 0 && (
              <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-1 rounded-md">
                {dashboard.lowStock.length} urgent
              </span>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto custom-scrollbar">
            {dashboard.lowStock.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">Votre stock est optimal.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {dashboard.lowStock.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border group">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:scale-110 transition-transform">
                      <Package size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate">{item.productName}</h4>
                      <p className="text-xs text-destructive font-medium mt-0.5">
                        Reste: {item.stock} {item.unit} (Seuil: {item.lowStockThreshold})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {dashboard.lowStock.length > 0 && (
            <div className="p-4 border-t border-border mt-auto">
              <Link href="/stock" className="w-full py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-xl transition-colors flex items-center justify-center gap-2">
                Gérer le stock <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dernières ventes</CardTitle>
          <Link href="/ventes" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            Tout voir <ArrowRight size={16} />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Référence</th>
                  <th className="px-6 py-3 font-semibold">Montant</th>
                  <th className="px-6 py-3 font-semibold">Paiement</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {dashboard.recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      Aucune vente récente.
                    </td>
                  </tr>
                ) : (
                  dashboard.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{sale.reference || "-"}</td>
                      <td className="px-6 py-3 font-bold">{formatFCFA(sale.total)}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TONE_STYLES: Record<string, { bg: string; border: string; ring: string; iconBg: string }> = {
  blue:    { bg: "bg-gradient-to-br from-white to-blue-50/60",     border: "border-blue-200/70",    ring: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_0_rgba(37,99,235,0.10),0_8px_20px_-10px_rgba(37,99,235,0.30)]",  iconBg: "bg-blue-50 border-blue-200/70" },
  emerald: { bg: "bg-gradient-to-br from-white to-emerald-50/60",  border: "border-emerald-200/70", ring: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_0_rgba(16,185,129,0.10),0_8px_20px_-10px_rgba(16,185,129,0.28)]", iconBg: "bg-emerald-50 border-emerald-200/70" },
  indigo:  { bg: "bg-gradient-to-br from-white to-indigo-50/60",   border: "border-indigo-200/70",  ring: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_0_rgba(79,70,229,0.10),0_8px_20px_-10px_rgba(79,70,229,0.28)]",  iconBg: "bg-indigo-50 border-indigo-200/70" },
  rose:    { bg: "bg-gradient-to-br from-white to-rose-50/70",     border: "border-rose-200/70",    ring: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_0_rgba(244,63,94,0.10),0_8px_20px_-10px_rgba(244,63,94,0.30)]",   iconBg: "bg-rose-50 border-rose-200/70" },
  slate:   { bg: "bg-gradient-to-br from-white to-slate-50",       border: "border-slate-200/80",   ring: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_0_rgba(15,23,42,0.06),0_8px_20px_-10px_rgba(15,23,42,0.18)]",    iconBg: "bg-slate-50 border-slate-200/70" },
};

function KpiCard({ title, value, trend, trendUp, icon, tone = "slate" }: any) {
  const t = TONE_STYLES[tone] ?? TONE_STYLES.slate;
  return (
    <Card className={`${t.bg} ${t.border} ${t.ring} hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${t.iconBg}`}>
            {icon}
          </div>
          {trend && (
            <div className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
          <p className="font-display font-bold text-2xl text-foreground mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}