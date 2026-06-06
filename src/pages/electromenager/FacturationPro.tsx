import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { proInvoices } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { FileSpreadsheet, Plus, Download, Send } from "lucide-react";
import { toast } from "sonner";

const TYPE_CLS: Record<string, string> = {
  "Proforma":         "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Facture":          "bg-blue-50 text-blue-700 border-blue-200",
  "Bon de livraison": "bg-amber-50 text-amber-700 border-amber-200",
  "Reçu":             "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const STATUS_CLS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-50 text-blue-700",
  paid:  "bg-emerald-50 text-emerald-700",
};
const STATUS_LBL: Record<string, string> = { draft: "Brouillon", sent: "Envoyée", paid: "Payée" };

export function FacturationPro() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Facturation Pro</h1>
          <p className="text-muted-foreground mt-1">Proforma, facture commerciale, bon de livraison, reçu — exports PDF.</p>
        </div>
        <Button><Plus size={16} /> Nouveau document</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["Proforma","Facture","Bon de livraison","Reçu"] as const).map(t => (
          <Card key={t} className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardContent className="p-5 text-center">
              <FileSpreadsheet className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">{t}</p>
              <p className="text-xs text-muted-foreground mt-1">{proInvoices.filter(p => p.type === t).length} documents</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">N°</th>
                <th className="text-left px-6 py-3 font-semibold">Type</th>
                <th className="text-left px-6 py-3 font-semibold">Client</th>
                <th className="text-right px-6 py-3 font-semibold">Total</th>
                <th className="text-left px-6 py-3 font-semibold">Date</th>
                <th className="text-left px-6 py-3 font-semibold">Statut</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {proInvoices.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-mono text-xs font-semibold">{p.number}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${TYPE_CLS[p.type]}`}>{p.type}</span>
                  </td>
                  <td className="px-6 py-4 font-medium">{p.customer}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatFCFA(p.total)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${STATUS_CLS[p.status]}`}>{STATUS_LBL[p.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toast.success(`PDF ${p.number} téléchargé`)}><Download size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.success(`${p.number} envoyé via WhatsApp`)}><Send size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
