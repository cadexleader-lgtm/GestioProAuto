import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Send, Printer, Mail, FileSpreadsheet, Receipt, ScrollText, FileSignature } from "lucide-react";
import { proInvoices } from "@/lib/demo-data";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";

const TYPES = [
  { id: "facture",  label: "Facture",          icon: FileSpreadsheet, color: "blue" },
  { id: "proforma", label: "Proforma",         icon: FileText,        color: "indigo" },
  { id: "bl",       label: "Bon de livraison", icon: ScrollText,      color: "amber" },
  { id: "recu",     label: "Reçu",             icon: Receipt,         color: "emerald" },
  { id: "contrat",  label: "Contrat",          icon: FileSignature,   color: "purple" },
  { id: "rapport",  label: "Rapport",          icon: FileText,        color: "rose" },
];

const colorClass = (c: string) => ({
  blue:    "bg-blue-50 text-blue-700",
  indigo:  "bg-indigo-50 text-indigo-700",
  amber:   "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  purple:  "bg-purple-50 text-purple-700",
  rose:    "bg-rose-50 text-rose-700",
}[c] || "bg-slate-50 text-slate-700");

export function Documents() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">Générez et envoyez vos documents professionnels en quelques clics.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TYPES.map(t => {
          const Icon = t.icon;
          return (
            <Card key={t.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <CardContent className="p-5 text-center">
                <div className={`w-12 h-12 rounded-xl ${colorClass(t.color)} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={20} />
                </div>
                <p className="font-semibold text-xs">{t.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <h3 className="font-display font-semibold p-6 pb-4">Documents récents</h3>
          <div className="border-t divide-y">
            {proInvoices.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{p.number} · {p.type}</p>
                  <p className="text-xs text-muted-foreground">{p.customer} · {new Date(p.date).toLocaleDateString("fr-FR")}</p>
                </div>
                <p className="font-bold text-sm hidden sm:block">{formatFCFA(p.total)}</p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => toast.success(`Téléchargement PDF ${p.number}`)} title="Télécharger"><Download size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toast.success(`Impression ${p.number}`)} title="Imprimer"><Printer size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toast.success(`Envoyé par WhatsApp`)} title="WhatsApp"><Send size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toast.success(`Envoyé par email`)} title="Email"><Mail size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
