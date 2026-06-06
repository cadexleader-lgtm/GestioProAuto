import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";
import { appliances, warranties, proInvoices, applianceCredits } from "@/lib/demo-data";
import { Tv, ShieldCheck, FileSpreadsheet, CreditCard, ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ElectroDashboard() {
  const totalStock = appliances.reduce((s, a) => s + a.stock, 0);
  const stockValue = appliances.reduce((s, a) => s + a.cost * a.stock, 0);
  const activeWarranties = warranties.filter(w => w.status === "active").length;
  const expiringWarranties = warranties.filter(w => w.status === "active" && (+new Date(w.expiresAt) - Date.now() < 1000*60*60*24*60)).length;
  const pendingProforma = proInvoices.filter(p => p.type === "Proforma" && p.status !== "paid").length;
  const totalCredits = applianceCredits.reduce((s, c) => s + (c.total - c.downPayment - c.paidMonths * c.monthlyPayment), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tableau de bord — Électroménager</h1>
        <p className="text-muted-foreground mt-1">Stock, garanties actives, facturation pro et crédits clients.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Tv className="text-blue-600" />}            label="Produits en stock" value={`${totalStock}`}             tone="blue" />
        <Kpi icon={<ShieldCheck className="text-emerald-600" />} label="Garanties actives" value={`${activeWarranties}`}      tone="emerald" />
        <Kpi icon={<FileSpreadsheet className="text-indigo-600" />} label="Proformas en cours" value={`${pendingProforma}`}    tone="indigo" />
        <Kpi icon={<CreditCard className="text-amber-600" />}   label="Encours crédits"   value={formatFCFA(totalCredits)}    tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-6">
              <div>
                <h3 className="font-display font-semibold">Top produits</h3>
                <p className="text-xs text-muted-foreground">Valeur stock {formatFCFA(stockValue)}</p>
              </div>
              <Link to="/app/stock" className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:underline">
                Voir tout <ArrowRight size={14} />
              </Link>
            </div>
            <table className="w-full text-sm border-t">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Produit</th>
                  <th className="text-left px-6 py-3 font-semibold">Marque</th>
                  <th className="text-right px-6 py-3 font-semibold">Prix</th>
                  <th className="text-right px-6 py-3 font-semibold">Stock</th>
                  <th className="text-right px-6 py-3 font-semibold">Garantie</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appliances.slice(0,6).map(a => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium"><span className="mr-2">{a.emoji}</span>{a.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{a.brand}</td>
                    <td className="px-6 py-3 text-right font-semibold">{formatFCFA(a.price)}</td>
                    <td className="px-6 py-3 text-right">{a.stock}</td>
                    <td className="px-6 py-3 text-right text-xs text-muted-foreground">{a.warrantyMonths} mois</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Garanties à surveiller</h3>
              {expiringWarranties > 0 && (
                <span className="rounded-full bg-amber-50 text-amber-700 text-xs font-bold px-2 py-1">{expiringWarranties}</span>
              )}
            </div>
            <div className="space-y-3">
              {warranties.slice(0,4).map(w => (
                <div key={w.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    w.status === "claim" ? "bg-rose-50 text-rose-700" :
                    w.status === "expired" ? "bg-slate-100 text-slate-500" :
                    "bg-emerald-50 text-emerald-700"
                  }`}>
                    {w.status === "claim" ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{w.productName}</p>
                    <p className="text-xs text-muted-foreground">{w.customer} · expire {new Date(w.expiresAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/app/elec/garanties" className="mt-4 block text-center text-sm font-medium text-primary hover:underline">
              Toutes les garanties
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue"|"emerald"|"indigo"|"amber" }) {
  const tones = {
    blue: "from-white to-blue-50 border-blue-200/70",
    emerald: "from-white to-emerald-50 border-emerald-200/70",
    indigo: "from-white to-indigo-50 border-indigo-200/70",
    amber: "from-white to-amber-50 border-amber-200/70",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]} hover:-translate-y-0.5 transition-all`}>
      <CardContent className="p-5">
        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center mb-3">{icon}</div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="font-display font-bold text-xl mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
