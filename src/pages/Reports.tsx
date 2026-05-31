import { useState } from "react";
import { useGetReportSummary, GetReportSummaryPeriod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFCFA } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Printer, TrendingUp, ShoppingCart, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Reports() {
  const [period, setPeriod] = useState<GetReportSummaryPeriod>("week");
  const { data: summary, isLoading } = useGetReportSummary({ period });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Rapports</h1>
          <p className="text-muted-foreground mt-1">Analysez vos performances.</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as GetReportSummaryPeriod)} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="day">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="week">7 Jours</TabsTrigger>
              <TabsTrigger value="month">30 Jours</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => window.print()} variant="outline" className="gap-2 shadow-sm">
            <Printer size={16} /> Exporter
          </Button>
        </div>
      </div>

      <div className="print-only hidden print:block mb-8">
        <h1 className="text-2xl font-bold">Rapport d'activité - {period === 'day' ? "Aujourd'hui" : period === 'week' ? '7 Derniers Jours' : '30 Derniers Jours'}</h1>
        <p className="text-muted-foreground">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard 
              title="Chiffre d'affaires" 
              value={formatFCFA(summary.totalRevenue)} 
              icon={<TrendingUp size={22} className="text-primary" />}
            />
            <KpiCard 
              title="Bénéfice estimé" 
              value={formatFCFA(summary.totalProfit)} 
              icon={<Target size={22} className="text-emerald-600" />}
            />
            <KpiCard 
              title="Ventes réalisées" 
              value={summary.totalSales.toString()} 
              icon={<ShoppingCart size={22} className="text-indigo-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Évolution des revenus et bénéfices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary.series} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(val) => period === 'day' ? new Date(val).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : new Date(val).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatFCFA(value), name === 'revenue' ? 'Revenus' : 'Bénéfice']}
                        labelFormatter={(label) => new Date(label).toLocaleString('fr-FR')}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenus" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="hsl(142, 71%, 45%)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Meilleurs produits</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-y border-border">
                        <th className="px-4 py-3 font-semibold">Produit</th>
                        <th className="px-4 py-3 font-semibold text-right">Qté</th>
                        <th className="px-4 py-3 font-semibold text-right">CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {summary.topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Aucune donnée</td>
                        </tr>
                      ) : (
                        summary.topProducts.map((p) => (
                          <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium truncate max-w-[120px]">{p.productName}</td>
                            <td className="px-4 py-3 text-right">{p.quantitySold}</td>
                            <td className="px-4 py-3 text-right font-bold text-primary">{formatFCFA(p.revenue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ title, value, icon }: any) {
  return (
    <Card className="shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-background/50 backdrop-blur-sm border border-border/50">
            {icon}
          </div>
        </div>
        <div>
          <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
          <p className="font-display font-bold text-2xl text-foreground mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}