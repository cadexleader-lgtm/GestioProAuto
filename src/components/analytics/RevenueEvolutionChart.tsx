import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "J" | "S" | "M" | "A";

interface Bucket { key: string; label: string; ca: number; depenses: number; }

/**
 * Live revenue vs expenses evolution chart driven by cash movements + expenses.
 * Filters: J = 24h par heure, S = 7j par jour, M = 30j par jour, A = 12 mois.
 */
export function RevenueEvolutionChart({ title = "Évolution CA vs Dépenses", className }: { title?: string; className?: string }) {
  const cash = useCollection("cash");
  const expenses = useCollection("expenses");
  const [period, setPeriod] = useState<Period>("S");

  const data = useMemo<Bucket[]>(() => {
    const now = new Date();
    const buckets: Bucket[] = [];
    const idx = new Map<string, Bucket>();

    const push = (key: string, label: string) => {
      const b: Bucket = { key, label, ca: 0, depenses: 0 };
      buckets.push(b);
      idx.set(key, b);
    };

    if (period === "J") {
      for (let h = 23; h >= 0; h--) {
        const d = new Date(now); d.setMinutes(0,0,0); d.setHours(d.getHours() - h);
        push(d.toISOString().slice(0,13), `${d.getHours()}h`);
      }
    } else if (period === "S") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
        push(d.toISOString().slice(0,10), d.toLocaleDateString("fr-FR", { weekday: "short" }));
      }
    } else if (period === "M") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
        push(d.toISOString().slice(0,10), `${d.getDate()}/${d.getMonth()+1}`);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        push(d.toISOString().slice(0,7), d.toLocaleDateString("fr-FR", { month: "short" }));
      }
    }

    const bucketKey = (iso: string) => {
      const d = new Date(iso);
      if (period === "J") return d.toISOString().slice(0,13);
      if (period === "A") return d.toISOString().slice(0,7);
      return d.toISOString().slice(0,10);
    };

    for (const m of cash) {
      const b = idx.get(bucketKey(m.date));
      if (!b) continue;
      if (m.type === "in") b.ca += m.amount;
      else if (m.type === "out") b.depenses += m.amount;
    }
    for (const e of expenses) {
      const b = idx.get(bucketKey(e.date));
      if (b) b.depenses += e.amount;
    }
    return buckets;
  }, [cash, expenses, period]);

  const totalCA = data.reduce((s, b) => s + b.ca, 0);
  const totalDep = data.reduce((s, b) => s + b.depenses, 0);
  const profit = totalCA - totalDep;

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700"><TrendingUp size={14}/> CA {formatFCFA(totalCA)}</span>
            <span className="flex items-center gap-1.5 text-rose-700"><TrendingDown size={14}/> Dép. {formatFCFA(totalDep)}</span>
            <span className={cn("flex items-center gap-1.5 font-semibold", profit >= 0 ? "text-primary" : "text-rose-700")}>
              <Wallet size={14}/> Profit {formatFCFA(profit)}
            </span>
          </div>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1 text-xs font-semibold">
          {(["J","S","M","A"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition",
                period === p ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "J" ? "Jour" : p === "S" ? "Semaine" : p === "M" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ca-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="dep-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : `${v}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name) => [formatFCFA(v), name === "ca" ? "CA" : "Dépenses"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 8px 20px -8px rgba(0,0,0,0.15)" }}
              />
              <Legend formatter={(v) => v === "ca" ? "Chiffre d'affaires" : "Dépenses"} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="ca" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#ca-grad)" />
              <Area type="monotone" dataKey="depenses" stroke="#f43f5e" strokeWidth={2} fill="url(#dep-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
