import { Card, CardContent } from "@/components/ui/card";
import { warranties } from "@/lib/demo-data";
import { ShieldCheck, AlertTriangle, Calendar } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  active:  { label: "Active",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ShieldCheck },
  expired: { label: "Expirée",      cls: "bg-slate-100 text-slate-600 border-slate-200",     icon: Calendar },
  claim:   { label: "SAV en cours", cls: "bg-rose-50 text-rose-700 border-rose-200",         icon: AlertTriangle },
};

export function Garanties() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Garanties & SAV</h1>
        <p className="text-muted-foreground mt-1">Suivez toutes les garanties actives et les SAV en cours.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Produit</th>
                <th className="text-left px-6 py-3 font-semibold">Client</th>
                <th className="text-left px-6 py-3 font-semibold">Vendu le</th>
                <th className="text-left px-6 py-3 font-semibold">Expire le</th>
                <th className="text-left px-6 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {warranties.map(w => {
                const st = STATUS[w.status];
                const Icon = st.icon;
                return (
                  <tr key={w.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{w.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{w.reference}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{w.customer}</p>
                      <p className="text-xs text-muted-foreground">{w.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(w.soldAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 font-medium">{new Date(w.expiresAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${st.cls}`}>
                        <Icon size={12} /> {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
