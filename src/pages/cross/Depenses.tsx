import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { expenses, EXPENSE_CATEGORIES } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { Receipt, Plus, Image as ImageIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(221 83% 53%)","hsl(48 96% 53%)","hsl(142 71% 45%)","hsl(280 65% 60%)","hsl(340 75% 55%)","hsl(199 89% 48%)","hsl(25 95% 53%)","hsl(174 62% 47%)","hsl(258 75% 63%)","hsl(0 0% 60%)"];

export function Depenses() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const totalToday = expenses.filter(e => e.date.startsWith(todayKey)).reduce((s, e) => s + e.amount, 0);
  const totalMonth = expenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const totalYear = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0), []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Dépenses</h1>
          <p className="text-muted-foreground mt-1">Centre de gestion financière, justificatifs & catégories.</p>
        </div>
        <Button><Plus size={16} /> Ajouter dépense</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Dépenses du jour"  value={formatFCFA(totalToday)} tone="blue" />
        <Stat label="Dépenses du mois"  value={formatFCFA(totalMonth)} tone="indigo" />
        <Stat label="Dépenses annuelles" value={formatFCFA(totalYear)} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold mb-4">Répartition par catégorie</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-0">
            <h3 className="font-display font-semibold p-6 pb-4">Dernières dépenses</h3>
            <div className="border-t divide-y">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.category} · {new Date(e.date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  {e.hasReceipt && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                      <ImageIcon size={10} /> Justif.
                    </span>
                  )}
                  <p className="font-bold text-sm">{formatFCFA(e.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "blue"|"indigo"|"rose" }) {
  const tones = { blue: "from-white to-blue-50 border-blue-200/70", indigo: "from-white to-indigo-50 border-indigo-200/70", rose: "from-white to-rose-50 border-rose-200/70" };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-6">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="font-display font-bold text-2xl mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}
