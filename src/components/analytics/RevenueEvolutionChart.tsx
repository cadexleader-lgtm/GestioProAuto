import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, LineChart as LineChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "J" | "S" | "M" | "A";

interface Bucket { key: string; label: string; ca: number; depenses: number; net: number; cumul: number; }

const PERIOD_LABEL: Record<Period, string> = { J: "Jour", S: "Semaine", M: "Mois", A: "Année" };

/**
 * Live revenue vs expenses evolution chart driven by cash movements + expenses.
 * J = 24h/heure, S = 7j/jour, M = 30j/jour, A = 12 mois.
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
      const b: Bucket = { key, label, ca: 0, depenses: 0, net: 0, cumul: 0 };
      buckets.push(b);
      idx.set(key, b);
    };

    if (period === "J") {
      for (let h = 23; h >= 0; h--) {
        const d = new Date(now); d.setMinutes(0, 0, 0); d.setHours(d.getHours() - h);
        push(d.toISOString().slice(0, 13), `${String(d.getHours()).padStart(2, "0")}h`);
      }
    } else if (period === "S") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        push(d.toISOString().slice(0, 10), d.toLocaleDateString("fr-FR", { weekday: "short" }));
      }
    } else if (period === "M") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        push(d.toISOString().slice(0, 10), `${d.getDate()}/${d.getMonth() + 1}`);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        push(d.toISOString().slice(0, 7), d.toLocaleDateString("fr-FR", { month: "short" }));
      }
    }

    const bucketKey = (iso: string) => {
      const d = new Date(iso);
      if (period === "J") return d.toISOString().slice(0, 13);
      if (period === "A") return d.toISOString().slice(0, 7);
      return d.toISOString().slice(0, 10);
    };

    // Le journal de caisse est la source unique de vérité : chaque dépense
    // génère déjà une sortie de caisse, on ne l'additionne donc pas deux fois.
    const cashOutKeys = new Set<string>();
    for (const m of cash) {
      const b = idx.get(bucketKey(m.date));
      if (!b) continue;
      if (m.type === "in") b.ca += m.amount;
      else if (m.type === "out") {
        b.depenses += m.amount;
        cashOutKeys.add(`${m.label}|${m.amount}|${bucketKey(m.date)}`);
      }
    }
    // Dépenses orphelines (saisies sans mouvement de caisse correspondant)
    for (const e of expenses) {
      const key = bucketKey(e.date);
      const b = idx.get(key);
      if (!b) continue;
      if (cashOutKeys.has(`${e.label}|${e.amount}|${key}`)) continue;
      b.depenses += e.amount;
    }


    let running = 0;
    for (const b of buckets) {
      b.net = b.ca - b.depenses;
      running += b.net;
      b.cumul = running;
    }
    return buckets;
  }, [cash, expenses, period]);

  const totalCA = data.reduce((s, b) => s + b.ca, 0);
  const totalDep = data.reduce((s, b) => s + b.depenses, 0);
  const profit = totalCA - totalDep;
  const hasData = totalCA > 0 || totalDep > 0;
  const best = data.reduce<Bucket | null>((m, b) => (!m || b.ca > m.ca ? b : m), null);

  const compact = (v: number) =>
    Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k`
      : `${v}`;

  return (
    <Card className={cn("rounded-2xl shadow-sm overflow-hidden", className)}>
      <CardHeader className="gap-4 pb-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {PERIOD_LABEL[period]} · {best && best.ca > 0 ? `Pic ${best.label} (${formatFCFA(best.ca)})` : "Synchronisé en temps réel"}
            </p>
          </div>
          <div className="inline-flex w-full lg:w-auto rounded-xl border border-border bg-muted/40 p-1 text-xs font-semibold">
            {(["J", "S", "M", "A"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "flex-1 lg:flex-none px-3 py-1.5 rounded-lg transition-colors",
                  period === p
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<TrendingUp size={14} />} label="Encaissé" value={formatFCFA(totalCA)} tone="emerald" />
          <Stat icon={<TrendingDown size={14} />} label="Dépenses" value={formatFCFA(totalDep)} tone="rose" />
          <Stat icon={<Wallet size={14} />} label="Profit net" value={formatFCFA(profit)} tone={profit >= 0 ? "primary" : "rose"} />
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[260px] sm:h-[320px] w-full">
          {!hasData ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <LineChartIcon size={28} className="opacity-40" />
              <p className="text-sm font-medium">Aucun mouvement sur cette période</p>
              <p className="text-xs">Les ventes, locations et dépenses s'afficheront ici automatiquement.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ca-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false} tickLine={false} width={48} tickFormatter={compact}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as Bucket;
                    return (
                      <div className="rounded-xl border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-foreground">{label}</p>
                        <p className="text-emerald-600">Encaissé · {formatFCFA(d.ca)}</p>
                        <p className="text-rose-600">Dépenses · {formatFCFA(d.depenses)}</p>
                        <p className={cn("font-semibold", d.net >= 0 ? "text-primary" : "text-rose-600")}>
                          Net · {formatFCFA(d.net)}
                        </p>
                        <p className="text-muted-foreground">Cumul · {formatFCFA(d.cumul)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="depenses" name="Dépenses" fill="#f43f5e" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={period === "M" || period === "J" ? 6 : 18} />
                <Area type="monotone" dataKey="ca" name="Encaissements" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#ca-grad)" />
                <Line type="monotone" dataKey="cumul" name="Cumul net" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 4" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] text-muted-foreground">
          <Legend color="hsl(var(--primary))" label="Encaissements" />
          <Legend color="#f43f5e" label="Dépenses" />
          <Legend color="#10b981" label="Cumul net" dashed />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-0.5 w-4 rounded-full"
        style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }}
      />
      {label}
    </span>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "rose" | "primary" }) {
  const cls = {
    emerald: "text-emerald-700 bg-emerald-50/70 border-emerald-200/60",
    rose: "text-rose-700 bg-rose-50/70 border-rose-200/60",
    primary: "text-primary bg-primary/5 border-primary/20",
  }[tone];
  return (
    <div className={cn("rounded-xl border px-2.5 py-2 min-w-0", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
        {icon}<span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 font-display font-bold text-sm sm:text-base tabular-nums truncate">{value}</p>
    </div>
  );
}
