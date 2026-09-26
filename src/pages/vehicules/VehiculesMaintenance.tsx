import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCollection, completeVehicleMaintenance, updateVehicleMaintenance,
  addMaintenanceSchedule, markMaintenanceScheduleDone, removeMaintenanceSchedule,
  recordManualExpense,
} from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { Wrench, Plus, AlertTriangle, Clock, CheckCircle2, TrendingDown, Pencil, RotateCcw, Trash2, CalendarClock } from "lucide-react";
import { MaintenanceVehicleDialog } from "@/components/vehicles/VehicleActionsDialogs";
import { toast } from "sonner";
import type { VehicleMaintenance } from "@/lib/demo-store";
import type { VehicleMaintenanceSchedule } from "@/lib/demo-data";
import { MAINTENANCE_STATUS as STATUS } from "@/lib/vehicle-status";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { useFeatureFlags } from "@/lib/feature-flags";

export function VehiculesMaintenance() {
  const flags = useFeatureFlags();
  const items = useCollection("vehicleMaintenances");
  const vehicles = useCollection("vehicles");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [openAdd, setOpenAdd] = useState(false);
  const [selectVehicle, setSelectVehicle] = useState<string>("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const completionKeys = useRef<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<{ vehicleId: string; label: string; frequencyMonths: number | ""; startDate: string; estimatedCost: number }>(
    { vehicleId: "", label: "Vidange", frequencyMonths: 3, startDate: new Date().toISOString().slice(0, 10), estimatedCost: 0 },
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [doneSchedule, setDoneSchedule] = useState<(VehicleMaintenanceSchedule & { vehicle: any }) | null>(null);
  const [doneCost, setDoneCost] = useState(0);
  const [doneMethod, setDoneMethod] = useState<"Cash" | "Wave" | "Orange Money" | "Virement" | "Chèque">("Cash");
  const [markingDone, setMarkingDone] = useState(false);

  const schedules = useMemo(() => {
    return vehicles
      .flatMap((v) => (v.maintenanceSchedules ?? []).map((s) => ({ ...s, vehicle: v })))
      .sort((a, b) => +new Date(a.nextDueDate) - +new Date(b.nextDueDate));
  }, [vehicles]);

  const saveSchedule = () => {
    if (!scheduleForm.vehicleId) return toast.error("Choisissez un véhicule");
    if (!scheduleForm.label.trim()) return toast.error("Renseignez le type d'entretien");
    const frequencyMonths = Number(scheduleForm.frequencyMonths);
    if (!frequencyMonths || frequencyMonths < 1) return toast.error("Renseignez une fréquence d'au moins 1 mois");
    if (savingSchedule) return;
    setSavingSchedule(true);
    try {
      addMaintenanceSchedule(scheduleForm.vehicleId, {
        label: scheduleForm.label.trim(),
        frequencyMonths,
        startDate: scheduleForm.startDate,
        estimatedCost: scheduleForm.estimatedCost || undefined,
      });
      toast.success("Entretien récurrent ajouté");
      setOpenSchedule(false);
      setScheduleForm({ vehicleId: "", label: "Vidange", frequencyMonths: 3, startDate: new Date().toISOString().slice(0, 10), estimatedCost: 0 });
    } finally {
      setSavingSchedule(false);
    }
  };

  const openDoneDialog = (s: VehicleMaintenanceSchedule & { vehicle: any }) => {
    setDoneSchedule(s);
    setDoneCost(s.estimatedCost || 0);
    setDoneMethod("Cash");
  };

  const confirmDone = async () => {
    if (!doneSchedule || markingDone) return;
    setMarkingDone(true);
    try {
      if (doneCost > 0) {
        await recordManualExpense({
          category: "Maintenance",
          label: `${doneSchedule.label} — ${doneSchedule.vehicle.brand} ${doneSchedule.vehicle.model} (${doneSchedule.vehicle.plate})`,
          amount: doneCost,
          paymentMethod: doneMethod,
          idempotencyKey: crypto.randomUUID(),
          sourceId: crypto.randomUUID(),
        });
      }
      markMaintenanceScheduleDone(doneSchedule.vehicle.id, doneSchedule.id, doneCost || undefined);
      toast.success(doneCost > 0 ? "Marqué comme fait — dépense enregistrée" : "Marqué comme fait");
      setDoneSchedule(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'entretien n'a pas pu être marqué comme fait.");
    } finally {
      setMarkingDone(false);
    }
  };

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

  const handleUpdateStatus = async (id: string, s: VehicleMaintenance["status"]) => {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await updateVehicleMaintenance({ maintenanceId: id, status: s });
      toast.success("Statut mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le statut n'a pas pu être mis à jour.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openEdit = (m: VehicleMaintenance) => {
    setEditForm({ partsCost: m.partsCost || 0, laborCost: m.laborCost || 0, otherCost: m.otherCost || 0, garage: m.garage || "", notes: m.notes || "" });
    setEditingId(m.id);
  };

  const saveEdit = async () => {
    if (!editingId || updatingId) return;
    setUpdatingId(editingId);
    try {
      await updateVehicleMaintenance({
        maintenanceId: editingId,
        partsCost: editForm.partsCost,
        laborCost: editForm.laborCost,
        otherCost: editForm.otherCost,
        garage: editForm.garage,
        notes: editForm.notes,
      });
      toast.success("Coûts mis à jour");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Les coûts n'ont pas pu être mis à jour.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (completingId) return;
    const idempotencyKey = completionKeys.current[id] ?? crypto.randomUUID();
    completionKeys.current[id] = idempotencyKey;
    setCompletingId(id);
    try {
      const result = await completeVehicleMaintenance({
        maintenanceId: id,
        completedAt: new Date().toISOString().slice(0, 10),
        currency: "XOF",
        paymentMethod: "Cash",
        idempotencyKey,
        metadata: {},
      });
      toast.success(
        result?.amount > 0
          ? "Maintenance terminée et dépense enregistrée"
          : "Maintenance terminée — aucun paiement à enregistrer",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La maintenance n'a pas été clôturée.");
    } finally {
      setCompletingId(null);
    }
  };

  if (!flags.maintenance) {
    return <RestrictedAccess title="Maintenance" message="Ce module est désactivé pour votre entreprise. Un patron peut le réactiver dans Paramètres." />;
  }

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

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
              <CalendarClock size={16} className="text-primary" /> Entretiens récurrents
            </h2>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpenSchedule(true)}>
              <Plus size={13} /> Ajouter
            </Button>
          </div>
          {schedules.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Aucun entretien récurrent programmé (vidange, freins…). Ajoutez-en un pour être alerté avant l'échéance.
            </p>
          ) : (
            <div className="grid gap-1.5">
              {schedules.map((s) => {
                const days = Math.round((+new Date(s.nextDueDate) - Date.now()) / 86400000);
                const overdue = days < 0;
                const soon = !overdue && days <= 30;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 sm:gap-3 rounded-xl border p-2.5 sm:p-3 ${
                      overdue ? "border-rose-300 bg-rose-50/60 dark:border-rose-800/40 dark:bg-rose-950/20"
                        : soon ? "border-amber-300 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {s.label} — {s.vehicle.brand} {s.vehicle.model} <span className="text-muted-foreground">({s.vehicle.plate})</span>
                      </p>
                      <p className={`text-[11px] sm:text-xs ${overdue ? "text-rose-700 dark:text-rose-400" : soon ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                        Tous les {s.frequencyMonths} mois · prochaine échéance {new Date(s.nextDueDate).toLocaleDateString("fr-FR")}
                        {overdue ? " · en retard" : soon ? ` · dans ${days}j` : ""}
                        {s.estimatedCost ? ` · ≈ ${formatFCFA(s.estimatedCost)}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      disabled={!overdue && !soon}
                      title={!overdue && !soon ? `Disponible à partir de 30 jours avant l'échéance (dans ${days}j)` : undefined}
                      onClick={() => openDoneDialog(s)}
                    >
                      <RotateCcw size={13} /> Fait
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => removeMaintenanceSchedule(s.vehicle.id, s.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 grid place-items-center text-xl sm:text-3xl bg-muted/40">
                    {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover" /> : v.photo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-bold text-sm sm:text-base truncate">{v.brand} {v.model}</h3>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border shrink-0 ${st.cls}`}>{st.label}</span>
                      {m.priority === "high" && <Badge variant="destructive" className="text-[9px] shrink-0">Prioritaire</Badge>}
                    </div>
                    <p className="text-xs sm:text-sm font-medium mt-0.5 sm:mt-1 truncate">{m.motif}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      {m.type} · {m.garage || "—"}
                      {m.status !== "done" && ` · ${days}j`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold hidden sm:block">Coût</p>
                    <p className="font-display font-bold text-sm sm:text-lg whitespace-nowrap">{formatFCFA(cost)}</p>
                  </div>
                </div>

                {m.status !== "done" ? (
                  <div className="mt-2.5 sm:mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                    <Select value={m.status} disabled={updatingId === m.id} onValueChange={(v) => void handleUpdateStatus(m.id, v as VehicleMaintenance["status"])}>
                      <SelectTrigger className="col-span-2 sm:w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="diagnostic">Diagnostic</SelectItem>
                        <SelectItem value="repair">Réparation</SelectItem>
                        <SelectItem value="parts_wait">Attente pièces</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8 text-xs" disabled={updatingId === m.id || completingId === m.id} onClick={() => openEdit(m)}>
                      <Pencil size={13} /> Coûts
                    </Button>
                    <Button size="sm" className="h-8 text-xs" disabled={completingId === m.id} onClick={() => void handleComplete(m.id)}>
                      <CheckCircle2 size={13} /> {completingId === m.id ? "Clôture..." : "Terminer"}
                    </Button>
                  </div>
                ) : (
                  m.dateOut && (
                    <p className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> Sortie {new Date(m.dateOut).toLocaleDateString("fr-FR")}
                    </p>
                  )
                )}

                {m.notes && <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground italic truncate">"{m.notes}"</p>}
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

      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) setEditingId(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier les coûts</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pièces</Label><MoneyInput value={editForm.partsCost} onChange={(v) => setEditForm({ ...editForm, partsCost: v })} /></div>
              <div><Label>Main-d'œuvre</Label><MoneyInput value={editForm.laborCost} onChange={(v) => setEditForm({ ...editForm, laborCost: v })} /></div>
            </div>
            <div><Label>Autres frais</Label><MoneyInput value={editForm.otherCost} onChange={(v) => setEditForm({ ...editForm, otherCost: v })} /></div>
            <div><Label>Garage / Technicien</Label><Input value={editForm.garage || ""} onChange={(e) => setEditForm({ ...editForm, garage: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingId(null)} disabled={!!updatingId}>Annuler</Button>
            <Button onClick={() => void saveEdit()} disabled={!!updatingId}>{updatingId === editingId ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ajouter un entretien récurrent</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Véhicule</Label>
              <Select value={scheduleForm.vehicleId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, vehicleId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un véhicule" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter((v) => v.status !== "sold").map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'entretien</Label>
              <Select value={scheduleForm.label} onValueChange={(v) => setScheduleForm({ ...scheduleForm, label: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vidange">Vidange</SelectItem>
                  <SelectItem value="Freins">Freins</SelectItem>
                  <SelectItem value="Filtres">Filtres</SelectItem>
                  <SelectItem value="Courroie de distribution">Courroie de distribution</SelectItem>
                  <SelectItem value="Pneus">Pneus</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fréquence (mois)</Label>
                <Input
                  type="number"
                  min={1}
                  value={scheduleForm.frequencyMonths}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // Ne pas forcer une valeur (ex. 1) tant que le champ est
                    // vide en cours de saisie — sinon impossible de taper "2"
                    // après avoir effacé le "1" par défaut (il revenait à 1 à
                    // chaque frappe). La fréquence minimale est vérifiée à
                    // l'enregistrement (saveSchedule), pas ici.
                    setScheduleForm({ ...scheduleForm, frequencyMonths: raw === "" ? "" : Math.max(0, Number(raw)) });
                  }}
                />
              </div>
              <div>
                <Label>Dernier fait le</Label>
                <Input type="date" value={scheduleForm.startDate} onChange={(e) => setScheduleForm({ ...scheduleForm, startDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Coût estimé (FCFA) — optionnel</Label>
              <MoneyInput value={scheduleForm.estimatedCost} onChange={(v) => setScheduleForm({ ...scheduleForm, estimatedCost: v })} />
              <p className="text-[11px] text-muted-foreground mt-1">Indicatif — le montant réel se saisit à chaque "Fait", le prix du marché pouvant varier.</p>
            </div>
            {scheduleForm.frequencyMonths !== "" && (
              <p className="text-xs text-muted-foreground">
                Prochaine échéance calculée : {new Date(new Date(scheduleForm.startDate).setMonth(new Date(scheduleForm.startDate).getMonth() + Number(scheduleForm.frequencyMonths))).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenSchedule(false)} disabled={savingSchedule}>Annuler</Button>
            <Button onClick={saveSchedule} disabled={savingSchedule}>{savingSchedule ? "Ajout..." : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!doneSchedule} onOpenChange={(o) => !o && setDoneSchedule(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Marquer comme fait</DialogTitle></DialogHeader>
          {doneSchedule && (
            <div className="space-y-3 mt-2">
              <p className="text-sm">
                {doneSchedule.label} — {doneSchedule.vehicle.brand} {doneSchedule.vehicle.model} <span className="text-muted-foreground">({doneSchedule.vehicle.plate})</span>
              </p>
              <div>
                <Label>Coût réel (FCFA) — optionnel</Label>
                <MoneyInput value={doneCost} onChange={setDoneCost} />
                {doneSchedule.estimatedCost ? (
                  <p className="text-[11px] text-muted-foreground mt-1">Estimation précédente : {formatFCFA(doneSchedule.estimatedCost)}</p>
                ) : null}
              </div>
              {doneCost > 0 && (
                <div>
                  <Label>Mode de paiement</Label>
                  <Select value={doneMethod} onValueChange={(v) => setDoneMethod(v as typeof doneMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Cash", "Wave", "Orange Money", "Virement", "Chèque"] as const).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Une dépense "Maintenance" sera enregistrée pour ce montant.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDoneSchedule(null)} disabled={markingDone}>Annuler</Button>
            <Button onClick={confirmDone} disabled={markingDone}>{markingDone ? "Enregistrement..." : "Confirmer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "amber" }) {
  const cls = tone === "amber"
    ? "bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200 dark:from-amber-950/40 dark:to-amber-950/20 dark:border-amber-800/40"
    : "bg-white/88 border-slate-200/60 dark:bg-card dark:border-border";
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 dark:bg-background/60 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-xl tabular-nums">{value}</p>
    </div>
  );
}
