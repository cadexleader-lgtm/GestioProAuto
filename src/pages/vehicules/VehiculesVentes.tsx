import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { ShoppingCart, Search, FileText, MessageCircle, TrendingUp, Wallet, Package, Plus, Bell } from "lucide-react";
import { generateSaleInvoice, sendWhatsApp } from "@/lib/vehicle-pdf";
import { toast } from "sonner";
import { SaleWorkflowDialog } from "@/components/vehicles/SaleWorkflowDialog";

export function VehiculesVentes() {
  const sales = useCollection("vehicleSales");
  const vehicles = useCollection("vehicles");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "cash" | "credit">("all");
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const filtered = useMemo(() => {
    return sales
      .filter((s) => filter === "all" ? true : s.payment === filter)
      .filter((s) => {
        if (!q) return true;
        const v = vehicles.find((x) => x.id === s.vehicleId);
        const hay = `${s.customer} ${v?.brand} ${v?.model} ${v?.plate}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [sales, vehicles, q, filter]);

  const stats = useMemo(() => {
    const total = sales.reduce((s, x) => s + x.amount, 0);
    const cash = sales.filter((s) => s.payment === "cash").reduce((s, x) => s + x.amount, 0);
    const credit = sales.filter((s) => s.payment === "credit").reduce((s, x) => s + x.amount, 0);
    return { count: sales.length, total, cash, credit };
  }, [sales]);

  const handlePdf = (saleId: string) => {
    const s = sales.find((x) => x.id === saleId);
    const v = s && vehicles.find((x) => x.id === s.vehicleId);
    if (!s || !v) return;
    generateSaleInvoice(s, v);
    toast.success("Facture PDF générée");
  };

  const handleWa = (saleId: string) => {
    const s = sales.find((x) => x.id === saleId);
    const v = s && vehicles.find((x) => x.id === s.vehicleId);
    if (!s || !v || !s.phone) return toast.error("Numéro client manquant");
    sendWhatsApp(
      s.phone,
      `Bonjour ${s.customer}, merci pour l'achat de votre ${v.brand} ${v.model} d'un montant de ${formatFCFA(s.amount)}. — GestioPro`,
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Ventes de véhicules</h1>
          <p className="text-muted-foreground mt-1 text-sm">Historique complet des ventes cash et à crédit.</p>
        </div>
        <Button onClick={() => setWorkflowOpen(true)} size="lg" className="shadow-lg">
          <Plus size={18} /> Nouveau dossier de vente
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Package className="text-slate-600" size={18} />} label="Total ventes" value={String(stats.count)} />
        <Kpi icon={<TrendingUp className="text-emerald-600" size={18} />} label="CA total" value={formatFCFA(stats.total)} />
        <Kpi icon={<Wallet className="text-indigo-600" size={18} />} label="Comptant" value={formatFCFA(stats.cash)} />
        <Kpi icon={<ShoppingCart className="text-violet-600" size={18} />} label="À crédit" value={formatFCFA(stats.credit)} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client, véhicule, plaque..." className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "cash", "credit"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "Tous" : f === "cash" ? "Comptant" : "Crédit"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((s) => {
          const v = vehicles.find((x) => x.id === s.vehicleId);
          if (!v) return null;
          return (
            <Card key={s.id} className="shadow-sm hover:shadow-md transition">
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="text-4xl shrink-0">
                  {v.image ? <img src={v.image} alt="" className="w-14 h-14 rounded-lg object-cover" /> : v.photo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
                    <Badge variant={s.payment === "credit" ? "secondary" : "default"}>
                      {s.payment === "credit" ? "Crédit" : "Comptant"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.customer} {s.phone ? `· ${s.phone}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("fr-FR")} · {v.plate}</p>
                  {(s.reminders?.insuranceExpiry || s.reminders?.techControlExpiry || s.documents?.length) && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {!!s.documents?.length && <Badge variant="outline" className="text-[10px]"><FileText size={10} className="mr-1"/>{s.documents.length} doc</Badge>}
                      {s.reminders?.insuranceExpiry && <Badge variant="outline" className="text-[10px]"><Bell size={10} className="mr-1"/>Assurance {new Date(s.reminders.insuranceExpiry).toLocaleDateString("fr-FR")}</Badge>}
                      {s.reminders?.techControlExpiry && <Badge variant="outline" className="text-[10px]"><Bell size={10} className="mr-1"/>CT {new Date(s.reminders.techControlExpiry).toLocaleDateString("fr-FR")}</Badge>}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Montant</p>
                  <p className="font-display font-bold text-primary text-lg">{formatFCFA(s.amount)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePdf(s.id)}><FileText size={14} /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => handleWa(s.id)}><MessageCircle size={14} /> WhatsApp</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart size={48} className="mx-auto opacity-30 mb-3" />
            <p>Aucune vente enregistrée</p>
          </div>
        )}
      </div>

      <SaleWorkflowDialog open={workflowOpen} onOpenChange={setWorkflowOpen} />
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 backdrop-blur-xl bg-white/70 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="font-display font-bold text-lg tabular-nums truncate">{value}</p>
    </div>
  );
}
