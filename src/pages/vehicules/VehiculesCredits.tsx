import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { CreditCard, AlertTriangle, Plus, Wallet, TrendingDown, FileText, MessageCircle } from "lucide-react";
import { CreditPaymentDialog } from "@/components/vehicles/VehicleActionsDialogs";
import { NewCreditSaleDialog } from "@/components/vehicles/NewCreditSaleDialog";
import { generateCreditSchedule, sendWhatsApp } from "@/lib/vehicle-pdf";
import { toast } from "sonner";
import type { VehicleCredit } from "@/lib/demo-data";

export function VehiculesCredits() {
  const credits = useCollection("vehicleCredits");
  const vehicles = useCollection("vehicles");
  const payments = useCollection("vehiclePayments");
  const [openDetail, setOpenDetail] = useState<VehicleCredit | null>(null);
  const [openPay, setOpenPay] = useState<VehicleCredit | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const stats = useMemo(() => {
    const totalDue = credits.reduce((s, c) => {
      const paid = c.downPayment + payments.filter(p => p.creditId === c.id).reduce((x, p) => x + p.amount, 0);
      return s + Math.max(0, c.total - paid);
    }, 0);
    const late = credits.filter(c => c.status === "late").length;
    return { active: credits.length, totalDue, late };
  }, [credits, payments]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Ventes à crédit</h1>
          <p className="text-muted-foreground mt-1 text-sm">Suivi des échéances, paiements et alertes.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="shadow-lg shadow-primary/20">
          <Plus size={16} /> Nouvelle vente à crédit
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Crédits actifs" value={String(stats.active)} icon={<CreditCard className="text-indigo-600" size={18} />} />
        <Kpi label="Reste à encaisser" value={formatFCFA(stats.totalDue)} icon={<Wallet className="text-violet-600" size={18} />} />
        <Kpi label="En retard" value={String(stats.late)} icon={<AlertTriangle className="text-rose-600" size={18} />} tone={stats.late > 0 ? "rose" : undefined} />
      </div>

      <div className="grid gap-4">
        {credits.map(c => {
          const v = vehicles.find(x => x.id === c.vehicleId);
          if (!v) return null;
          const credPays = payments.filter(p => p.creditId === c.id);
          const paid = c.downPayment + credPays.reduce((s, p) => s + p.amount, 0);
          const remaining = Math.max(0, c.total - paid);
          const pct = Math.round((paid / c.total) * 100);
          return (
            <Card key={c.id} className={`shadow-sm border-l-4 ${c.status === "late" ? "border-l-rose-500" : "border-l-emerald-500"} cursor-pointer hover:shadow-md transition`} onClick={() => setOpenDetail(c)}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="text-4xl">{v.image ? <img src={v.image} alt="" className="w-14 h-14 rounded-lg object-cover" /> : v.photo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                      {c.status === "late" && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 inline-flex items-center gap-1">
                          <AlertTriangle size={10} /> EN RETARD
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prochaine</p>
                    <p className="font-semibold text-sm">{new Date(c.nextDueDate).toLocaleDateString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground">{formatFCFA(c.monthlyPayment)}/mois</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span><strong>{credPays.length + (c.downPayment > 0 ? 1 : 0)}</strong> versements · <strong>{c.paidMonths}</strong>/{c.totalMonths} mois</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${c.status === "late" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t text-sm">
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p><p className="font-semibold mt-0.5">{formatFCFA(c.total)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Apport</p><p className="font-semibold mt-0.5">{formatFCFA(c.downPayment)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Payé</p><p className="font-semibold mt-0.5 text-emerald-700">{formatFCFA(paid)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Reste</p><p className="font-semibold mt-0.5 text-rose-700">{formatFCFA(remaining)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail glassmorphism popup */}
      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/80 max-h-[90vh] overflow-y-auto">
          {openDetail && (() => {
            const v = vehicles.find(x => x.id === openDetail.vehicleId);
            const credPays = payments.filter(p => p.creditId === openDetail.id);
            const paid = openDetail.downPayment + credPays.reduce((s, p) => s + p.amount, 0);
            const remaining = Math.max(0, openDetail.total - paid);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Contrat de crédit — {v?.brand} {v?.model}</DialogTitle>
                  <DialogDescription>{openDetail.customer}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <Stat label="Total" value={formatFCFA(openDetail.total)} />
                  <Stat label="Payé" value={formatFCFA(paid)} tone="emerald" />
                  <Stat label="Reste" value={formatFCFA(remaining)} tone="rose" />
                  <Stat label="Mensualité" value={formatFCFA(openDetail.monthlyPayment)} />
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display font-semibold">Historique des paiements</h4>
                  <Button size="sm" onClick={() => { setOpenPay(openDetail); }}><Plus size={14} /> Ajouter</Button>
                </div>

                <div className="space-y-2">
                  {openDetail.downPayment > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50">
                      <div>
                        <p className="text-sm font-medium">Apport initial</p>
                        <p className="text-xs text-muted-foreground">Au contrat</p>
                      </div>
                      <strong className="text-emerald-700">{formatFCFA(openDetail.downPayment)}</strong>
                    </div>
                  )}
                  {credPays.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement enregistré</p>
                  )}
                  {credPays.slice().reverse().map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{p.date}</p>
                        <p className="text-xs text-muted-foreground">{p.method}{p.note ? ` · ${p.note}` : ""}</p>
                      </div>
                      <strong className="text-emerald-700">{formatFCFA(p.amount)}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-muted/40 text-sm flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5"><TrendingDown size={14} /> Statut</span>
                  <Badge variant={openDetail.status === "late" ? "destructive" : "secondary"}>{openDetail.status === "late" ? "En retard" : "À jour"}</Badge>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { if (v) { generateCreditSchedule(openDetail, v, credPays); toast.success("Échéancier PDF généré"); } }}>
                    <FileText size={14} /> Échéancier PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    sendWhatsApp("", `Bonjour ${openDetail.customer}, votre solde de crédit véhicule est de ${formatFCFA(remaining)}. Prochaine échéance le ${openDetail.nextDueDate}. — GestioPro`);
                  }}>
                    <MessageCircle size={14} /> Rappel WhatsApp
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <CreditPaymentDialog credit={openPay} open={!!openPay} onOpenChange={(o) => !o && setOpenPay(null)} />
      <NewCreditSaleDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: "rose" }) {
  const cls = tone === "rose" ? "bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200" : "bg-white/70 border-slate-200/60";
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-lg sm:text-xl tabular-nums truncate">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const cls = tone === "emerald" ? "bg-emerald-50 text-emerald-800" : tone === "rose" ? "bg-rose-50 text-rose-800" : "bg-muted";
  return (
    <div className={`p-3 rounded-xl ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">{label}</p>
      <p className="font-display font-bold text-base mt-1">{value}</p>
    </div>
  );
}
