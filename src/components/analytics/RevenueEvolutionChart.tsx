import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, LineChart as LineChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancePeriod, PeriodRange } from "@/lib/date-range";

interface Bucket { key: string; label: string; ca: number; depenses: number; net: number; cumul: number; }

/**
 * Live revenue vs expenses evolution chart driven by cash movements +
 * expenses. Période et bornes exactes pilotées par le parent (Tresorerie.tsx)
 * — avant, ce composant gérait son propre filtre interne indépendant de
 * celui affiché au-dessus (les KPI "Encaissements/Décaissements/Résultat
 * net"), ce qui les désynchronisait : changer un filtre ne changeait pas
 * l'autre. day = 24h/heure (00h→23h de la journée exacte, pas glissant sur
 * 24h), week = Lundi→Dimanche exact, month = tous les jours du mois
 * calendaire, year = 12 mois de l'année calendaire.
 */
export function RevenueEvolutionChart({
  title = "Évolution CA vs Dépenses",
  className,
  period,
  range,
}: {
  title?: string;
  className?: string;
  period: FinancePeriod;
  range: PeriodRange;
}) {
  const cash = useCollection("cash");
  const expenses = useCollection("expenses");

  const data = useMemo<Bucket[]>(() => {
    const buckets: Bucket[] = [];
    const idx = new Map<string, Bucket>();

    const push = (key: string, label: string) => {
      const b: Bucket = { key, label, ca: 0, depenses: 0, net: 0, cumul: 0 };
      buckets.push(b);
      idx.set(key, b);
    };

    if (period === "day") {
      for (let h = 0; h < 24; h++) {
        const d = new Date(range.start); d.setHours(h, 0, 0, 0);
        push(d.toISOString().slice(0, 13), `${String(h).padStart(2, "0")}h`);
      }
    } else if (period === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(range.start); d.setDate(d.getDate() + i);
        push(d.toISOString().slice(0, 10), d.toLocaleDateString("fr-FR", { weekday: "short" }));
      }
    } else if (period === "month") {
      const daysInMonth = Math.round((+range.end - +range.start) / 86400000);
      for (let i = 0; i < daysInMonth; i++) {
        const d = new Date(range.start); d.setDate(d.getDate() + i);
        push(d.toISOString().slice(0, 10), `${d.getDate()}`);
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const d = new Date(range.start.getFullYear(), range.start.getMonth() + i, 1);
        push(d.toISOString().slice(0, 7), d.toLocaleDateString("fr-FR", { month: "short" }));
      }
    }

    const bucketKey = (iso: string) => {
      const d = new Date(iso);
      if (period === "day") return d.toISOString().slice(0, 13);
      if (period === "year") return d.toISOString().slice(0, 7);
      return d.toISOString().slice(0, 10);
    };
    // Pas de check de fenêtre explicite : un mouvement hors de la période
    // produit une bucketKey absente de `idx` (buckets créés uniquement pour
    // la fenêtre affichée) — `idx.get()` renvoie alors undefined et la ligne
    // est ignorée plus bas (`if (!b) continue`).

    // Le journal de caisse est la source unique de vérité : chaque dépense
    // génère déjà une sortie de caisse, on ne l'additionne donc pas deux fois.
    const cashOutKeys = new Set<string>();
    for (const m of cash) {
      // Un virement interne (Wave -> Caisse principale...) n'est ni du CA ni une
      // dépense : c'est juste de l'argent qui change de compte au sein de l'entreprise.
      if (m.sourceType === "manual_cash_transfer") continue;
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
  }, [cash, expenses, period, +range.start, +range.end]);

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
              {range.label} · {best && best.ca > 0 ? `Pic ${best.label} (${formatFCFA(best.ca)})` : "Synchronisé en temps réel"}
            </p>
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
                <Bar dataKey="depenses" name="Dépenses" fill="hsl(var(--chart-cout))" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={period === "month" || period === "day" ? 6 : 18} />
                <Area type="monotone" dataKey="ca" name="Encaissements" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#ca-grad)" />
                <Line type="monotone" dataKey="cumul" name="Cumul net" stroke="hsl(var(--chart-profit))" strokeWidth={2} dot={false} strokeDasharray="5 4" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] text-muted-foreground">
          <Legend color="hsl(var(--primary))" label="Encaissements" />
          <Legend color="hsl(var(--chart-cout))" label="Dépenses" />
          <Legend color="hsl(var(--chart-profit))" label="Cumul net" dashed />
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
    emerald: "text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40",
    rose: "text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/40",
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
