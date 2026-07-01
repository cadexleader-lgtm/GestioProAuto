import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, completeVehicleMaintenance, db } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { Wrench, Plus, AlertTriangle, Clock, CheckCircle2, TrendingDown } from "lucide-react";
import { MaintenanceVehicleDialog } from "@/components/vehicles/VehicleActionsDialogs";
import { toast } from "sonner";
import type { VehicleMaintenance } from "@/lib/demo-store";

const STATUS: Record<VehicleMaintenance["status"], { label: string; cls: string }> = {
  pending:    { label: "En attente",       cls: "bg-slate-100 text-slate-700 border-slate-200" },
  diagnostic: { label: "Diagnostic",       cls: "bg-blue-50 text-blue-700 border-blue-200" },
  repair:     { label: "Réparation",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  parts_wait: { label: "Attente pièces",   cls: "bg-orange-50 text-orange-700 border-orange-200" },
  done:       { label: "Terminé",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function VehiculesMaintenance() {
  const items = useCollection("vehicleMaintenances");
  const vehicles = useCollection("vehicles");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [openAdd, setOpenAdd] = useState(false);
  const [selectVehicle, setSelectVehicle] = useState<string>("");

  const stats = useMemo(() => {
    const active = items.filter((m) => m.status !== "done").length;
    const done = items.filter((m) => m.status === "done").length;
    const costMonth = items
      .filter((m) => new Date(m.dateIn).getMonth() === new Date().getMonth())
      .reduce((s, m) => s + (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0), 0);
    return { active, done, costMonth };
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((m) => {
        if (filter === "active") return m.status !== "done";
        if (filter === "done") return m.status === "done";
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        const v = vehicles.find((x) => x.id === m.vehicleId);
        return `${m.motif} ${m.type} ${m.garage} ${v?.brand} ${v?.model} ${v?.plate}`.toLowerCase().includes(q.toLowerCase());
      })
      .sort((a, b) => +new Date(b.dateIn) - +new Date(a.dateIn));
  }, [items, vehicles, q, filter]);

  const chosenVehicle = selectVehicle ? vehicles.find((v) => v.id === selectVehicle) ?? null : null;

  const handleUpdateStatus = (id: string, s: VehicleMaintenance["status"]) => {
    db.update("vehicleMaintenances", id, { status: s } as any);
    toast.success("Statut mis à jour");
  };

  const handleComplete = (id: string) => {
    completeVehicleMaintenance(id);
    toast.success("Maintenance terminée — véhicule à nouveau disponible");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground mt-1 text-sm">Suivi des immobilisations, coûts et retours en service.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectVehicle} onValueChange={(v) => { setSelectVehicle(v); setOpenAdd(true); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Ajouter maintenance..." /></SelectTrigger>
            <SelectContent>
              {vehicles.filter((v) => v.status !== "sold").map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Wrench className="text-amber-600" size={18} />} label="En cours" value={String(stats.active)} tone="amber" />
        <Kpi icon={<CheckCircle2 className="text-emerald-600" size={18} />} label="Terminées" value={String(stats.done)} />
        <Kpi icon={<TrendingDown className="text-rose-600" size={18} />} label="Coût du mois" value={formatFCFA(stats.costMonth)} />
        <Kpi icon={<AlertTriangle className="text-orange-600" size={18} />} label="Attente pièces" value={String(items.filter((m) => m.status === "parts_wait").length)} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Motif, garage, véhicule..." />
        </div>
        <div className="flex gap-1">
          {(["active", "done", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "active" ? "En cours" : f === "done" ? "Terminées" : "Toutes"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((m) => {
          const v = vehicles.find((x) => x.id === m.vehicleId);
          if (!v) return null;
          const st = STATUS[m.status];
          const cost = (m.partsCost || 0) + (m.laborCost || 0) + (m.otherCost || 0);
          const days = Math.round((Date.now() - +new Date(m.dateIn)) / 86400000);
          return (
            <Card key={m.id} className={`shadow-sm border-l-4 ${m.status === "done" ? "border-l-emerald-500" : "border-l-amber-500"}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="text-3xl">{v.image ? <img src={v.image} alt="" className="w-12 h-12 rounded-lg object-cover" /> : v.photo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${st.cls}`}>{st.label}</span>
                      {m.priority === "high" && <Badge variant="destructive" className="text-[10px]">Prioritaire</Badge>}
                    </div>
                    <p className="text-sm font-medium mt-1">{m.motif}</p>
                    <p className="text-xs text-muted-foreground">{m.type} · {m.garage || "—"} · Entrée {new Date(m.dateIn).toLocaleDateString("fr-FR")}
                      {m.status !== "done" && ` · ${days}j immobilisé`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Coût</p>
                    <p className="font-display font-bold text-lg">{formatFCFA(cost)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  {m.status !== "done" && (
                    <>
                      <Select value={m.status} onValueChange={(v) => handleUpdateStatus(m.id, v as VehicleMaintenance["status"])}>
                        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="diagnostic">Diagnostic</SelectItem>
                          <SelectItem value="repair">Réparation</SelectItem>
                          <SelectItem value="parts_wait">Attente pièces</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => handleComplete(m.id)}>
                        <CheckCircle2 size={14} /> Terminer
                      </Button>
                    </>
                  )}
                  {m.status === "done" && m.dateOut && (
                    <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> Sortie {new Date(m.dateOut).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Pièces {formatFCFA(m.partsCost || 0)} · Main d'œuvre {formatFCFA(m.laborCost || 0)}
                  </span>
                </div>

                {m.notes && <p className="mt-2 text-xs text-muted-foreground italic">"{m.notes}"</p>}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench size={48} className="mx-auto opacity-30 mb-3" />
            <p>Aucune maintenance {filter === "active" ? "en cours" : ""}</p>
          </div>
        )}
      </div>

      <MaintenanceVehicleDialog
        vehicle={chosenVehicle}
        open={openAdd}
        onOpenChange={(o) => { setOpenAdd(o); if (!o) setSelectVehicle(""); }}
      />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "amber" }) {
  const cls = tone === "amber"
    ? "bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200"
    : "bg-white/70 border-slate-200/60";
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </div>
  );
}
