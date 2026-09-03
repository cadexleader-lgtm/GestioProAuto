import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText, Download, Send, Search, Plus, Trash2, FileSpreadsheet, Receipt,
  ScrollText, FileSignature, ClipboardList, BadgeCheck, RefreshCw,
} from "lucide-react";
import { useCollection, db } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { useCompanyProfile } from "@/lib/company-profile";
import {
  pdfInvoice, pdfReceipt, pdfPurchaseOrder, pdfAttestation, sendWhatsApp,
  type InvoiceLine,
} from "@/lib/pdf/templates";
import { SignaturePad } from "@/components/ui/signature-pad";
import { toast } from "sonner";

type DocKind = "facture" | "proforma" | "recu" | "bon" | "attestation";

const TYPES: { id: DocKind; label: string; icon: any; prefix: string; tint: string }[] = [
  { id: "facture",     label: "Facture",         icon: FileSpreadsheet, prefix: "FAC", tint: "bg-blue-50 text-blue-700" },
  { id: "proforma",    label: "Proforma / Devis", icon: FileText,       prefix: "PRO", tint: "bg-indigo-50 text-indigo-700" },
  { id: "recu",        label: "Reçu",            icon: Receipt,         prefix: "REC", tint: "bg-emerald-50 text-emerald-700" },
  { id: "bon",         label: "Bon de commande", icon: ClipboardList,   prefix: "BC",  tint: "bg-amber-50 text-amber-700" },
  { id: "attestation", label: "Attestation",     icon: BadgeCheck,      prefix: "ATT", tint: "bg-purple-50 text-purple-700" },
];

/** Types archivés automatiquement (non générables depuis cette page). */
const AUTO_TYPES = [
  { id: "contrat-vente",    label: "Contrat de vente",    icon: FileSignature, prefix: "VTE", tint: "bg-rose-50 text-rose-700" },
  { id: "contrat-location", label: "Contrat de location", icon: ScrollText,    prefix: "LOC", tint: "bg-cyan-50 text-cyan-700" },
  { id: "contrat-credit",   label: "Échéancier crédit",   icon: ScrollText,    prefix: "CRE", tint: "bg-orange-50 text-orange-700" },
  { id: "bulletin",         label: "Bulletin de paie",    icon: Receipt,       prefix: "PAI", tint: "bg-teal-50 text-teal-700" },
  { id: "piece",            label: "Pièce jointe",        icon: FileText,      prefix: "PJ",  tint: "bg-slate-100 text-slate-700" },
] as const;

const ALL_TYPES: { id: string; label: string; icon: any; prefix: string; tint: string }[] = [
  ...TYPES, ...AUTO_TYPES.map((t) => ({ ...t })),
];

const emptyLine = (): InvoiceLine => ({ designation: "", detail: "", qty: 1, unitPrice: 0 });
const today = () => new Date().toISOString().slice(0, 10);

export function Documents() {
  const docs = useCollection("documents");
  const vehicles = useCollection("vehicles");
  const profile = useCompanyProfile();
  const [kind, setKind] = useState<DocKind | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [q, setQ] = useState("");


  const [form, setForm] = useState({
    party: "", phone: "", address: "", note: "", date: today(),
    lines: [emptyLine()], paid: 0, amount: 0, reason: "", method: "Espèces",
    subject: "", body: "", signature: "" as string,
  });

  const reset = () => setForm({
    party: "", phone: "", address: "", note: "", date: today(),
    lines: [emptyLine()], paid: 0, amount: 0, reason: "", method: "Espèces",
    subject: "", body: "", signature: "",
  });

  const open = (k: DocKind) => { reset(); setKind(k); };

  const total = useMemo(
    () => form.lines.reduce((s, l) => s + (l.qty ?? 1) * (l.unitPrice || 0), 0),
    [form.lines],
  );

  const nextRef = (k: DocKind) => {
    const t = TYPES.find((x) => x.id === k)!;
    const n = docs.filter((d) => d.type === k).length + 1;
    return `${t.prefix}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  };

  const buildPdf = (k: DocKind, reference: string, data: typeof form) => {
    const signatures = data.signature ? { client: data.signature } : undefined;
    if (k === "facture" || k === "proforma") {
      pdfInvoice({
        reference, date: data.date, title: k === "proforma" ? "Facture proforma" : "Facture",
        customer: { name: data.party, phone: data.phone, address: data.address },
        lines: data.lines.filter((l) => l.designation),
        paid: k === "facture" ? data.paid : 0,
        note: data.note, signatures,
      });
    } else if (k === "recu") {
      pdfReceipt({
        reference, date: data.date, payerName: data.party, amount: data.amount,
        reason: data.reason || "Règlement", method: data.method, signatures,
      });
    } else if (k === "bon") {
      pdfPurchaseOrder({
        reference, date: data.date,
        supplier: { name: data.party, phone: data.phone, address: data.address },
        lines: data.lines.filter((l) => l.designation),
        note: data.note,
      });
    } else {
      pdfAttestation({
        reference, date: data.date, recipient: data.party,
        subject: data.subject || "Attestation", body: data.body,
      });
    }
  };

  const generate = () => {
    if (!kind) return;
    if (!form.party.trim()) return toast.error(kind === "bon" ? "Fournisseur requis" : "Nom du destinataire requis");
    const reference = nextRef(kind);
    const amount = kind === "recu" ? form.amount : total;

    buildPdf(kind, reference, form);
    db.add("documents", {
      type: kind,
      reference,
      title: `${TYPES.find((t) => t.id === kind)!.label} — ${form.party}`,
      relatedTo: form.party,
      amount,
      createdAt: new Date().toISOString(),
      payload: { ...form } as any,
    } as any);
    toast.success(`${reference} généré et archivé`);
    setKind(null);
  };

  const regenerate = (d: any) => {
    if (d.payload) buildPdf(d.type as DocKind, d.reference, d.payload);
    else toast.error("Document sans données source");
  };

  // Pièces jointes rattachées aux véhicules (carte grise, assurance, visite…)
  const vehicleDocs = useMemo(
    () => vehicles.flatMap((v: any) =>
      (v.documents ?? []).map((f: any) => ({
        id: `veh-${v.id}-${f.id}`,
        type: "piece",
        reference: f.name,
        title: `${f.type || "Pièce"} — ${v.brand} ${v.model}`,
        relatedTo: v.plate,
        amount: 0,
        createdAt: f.uploadedAt,
        entityType: "vehicle" as const,
        entityId: v.id,
        entityLabel: `${v.brand} ${v.model} (${v.plate})`,
        expiresAt: f.expiresAt,
        origin: "Importé",
        dataUrl: f.dataUrl,
      }))),
    [vehicles],
  );

  const allDocs = useMemo(() => [...docs, ...vehicleDocs], [docs, vehicleDocs]);

  const entityOptions = useMemo(() => {
    const map = new Map<string, string>();
    allDocs.forEach((d: any) => {
      const key = d.entityId ? `${d.entityType}:${d.entityId}` : d.relatedTo ? `party:${d.relatedTo}` : "";
      if (key) map.set(key, d.entityLabel || d.relatedTo);
    });
    return [...map].map(([key, label]) => ({ key, label }));
  }, [allDocs]);

  const daysLeft = (d: any) =>
    d.expiresAt ? Math.ceil((+new Date(d.expiresAt) - Date.now()) / 86400000) : null;

  const expiringCount = allDocs.filter((d: any) => {
    const n = daysLeft(d);
    return n !== null && n <= 30;
  }).length;

  const filtered = allDocs
    .filter((d: any) => filter === "all" || d.type === filter)
    .filter((d: any) => {
      if (entity === "all") return true;
      const key = d.entityId ? `${d.entityType}:${d.entityId}` : d.relatedTo ? `party:${d.relatedTo}` : "";
      return key === entity;
    })
    .filter((d: any) => { if (!expiringOnly) return true; const n = daysLeft(d); return n !== null && n <= 30; })
    .filter((d) => !q || `${d.reference} ${d.title} ${d.relatedTo ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const monthTotal = allDocs
    .filter((d) => (d.createdAt || "").slice(0, 7) === today().slice(0, 7))
    .reduce((s, d) => s + (d.amount || 0), 0);


  const isLineDoc = kind === "facture" || kind === "proforma" || kind === "bon";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Générez des PDF professionnels à votre image et retrouvez toutes vos archives.
          </p>
        </div>
        {!profile.name && (
          <Badge variant="outline" className="rounded-xl border-amber-300 bg-amber-50 text-amber-800">
            Complétez l'identité de l'entreprise dans Paramètres
          </Badge>
        )}
      </div>

      {/* Générateurs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const count = docs.filter((d) => d.type === t.id).length;
          return (
            <button key={t.id} onClick={() => open(t.id)}
              className="group text-left rounded-2xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={`w-11 h-11 rounded-xl ${t.tint} flex items-center justify-center mb-3`}>
                <Icon size={19} />
              </div>
              <p className="font-semibold text-sm leading-tight">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{count} document{count > 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Archives */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-3 border-b">
            <div>
              <h3 className="font-display font-semibold">Archives</h3>
              <p className="text-xs text-muted-foreground">
                {docs.length} document(s) · {formatFCFA(monthTotal)} ce mois-ci
              </p>
            </div>
            <div className="flex-1" />
            <div className="relative w-full lg:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9 rounded-xl" />
            </div>
            <select value={entity} onChange={(e) => setEntity(e.target.value)}
              className="h-10 rounded-xl border bg-background px-3 text-sm w-full lg:w-56">
              <option value="all">Toutes les entités</option>
              {entityOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <Button variant={expiringOnly ? "default" : "outline"} className="rounded-xl gap-1.5 shrink-0"
              onClick={() => setExpiringOnly((v) => !v)}>
              <CalendarClock size={15} /> Expire &lt; 30 j{expiringCount ? ` (${expiringCount})` : ""}
            </Button>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="rounded-xl overflow-x-auto max-w-full">
                <TabsTrigger value="all" className="rounded-lg text-xs">Tous</TabsTrigger>
                {ALL_TYPES.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="rounded-lg text-xs">{t.prefix}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

          </div>

          <div className="divide-y max-h-[520px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Aucun document. Choisissez un modèle ci-dessus pour commencer.
              </div>
            )}
            {filtered.map((d: any) => {
              const t = TYPES.find((x) => x.id === d.type);
              const Icon = t?.icon ?? FileText;
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-muted/30">
                  <div className={`w-10 h-10 rounded-xl ${t?.tint ?? "bg-slate-100 text-slate-600"} flex items-center justify-center shrink-0`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.title} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <p className="font-bold text-sm hidden sm:block whitespace-nowrap">{formatFCFA(d.amount || 0)}</p>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" title="Retélécharger le PDF" onClick={() => regenerate(d)}>
                      <Download size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" title="Régénérer" onClick={() => regenerate(d)}>
                      <RefreshCw size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" title="Envoyer par WhatsApp"
                      onClick={() => sendWhatsApp(d.payload?.phone || "", `Bonjour, voici votre document ${d.reference} d'un montant de ${formatFCFA(d.amount || 0)}.`)}>
                      <Send size={15} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" title="Supprimer"
                      onClick={() => { db.remove("documents", d.id); toast.success("Document supprimé"); }}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Générateur */}
      <Dialog open={!!kind} onOpenChange={(v) => !v && setKind(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature size={18} /> {TYPES.find((t) => t.id === kind)?.label}
            </DialogTitle>
            <DialogDescription>
              Référence automatique {kind ? nextRef(kind) : ""} · en-tête, logo et signature repris de votre profil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{kind === "bon" ? "Fournisseur *" : "Destinataire *"}</Label>
                <Input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} placeholder="Nom complet" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
              </div>
              {kind !== "attestation" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adresse</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl" />
                  </div>
                </>
              )}
            </div>

            {isLineDoc && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lignes du document</Label>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1"
                    onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}>
                    <Plus size={14} /> Ligne
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-xl border p-2">
                      <div className="col-span-12 sm:col-span-5">
                        <Input placeholder="Désignation" value={l.designation} className="rounded-lg"
                          onChange={(e) => {
                            const lines = [...form.lines]; lines[i] = { ...l, designation: e.target.value };
                            setForm({ ...form, lines });
                          }} />
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <Input placeholder="Détail" value={l.detail} className="rounded-lg"
                          onChange={(e) => {
                            const lines = [...form.lines]; lines[i] = { ...l, detail: e.target.value };
                            setForm({ ...form, lines });
                          }} />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <Input type="number" min={1} value={l.qty ?? 1} className="rounded-lg"
                          onChange={(e) => {
                            const lines = [...form.lines]; lines[i] = { ...l, qty: Math.max(1, +e.target.value) };
                            setForm({ ...form, lines });
                          }} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <MoneyInput value={l.unitPrice}
                          onChange={(v: number) => {
                            const lines = [...form.lines]; lines[i] = { ...l, unitPrice: v };
                            setForm({ ...form, lines });
                          }} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button type="button" size="icon" variant="ghost" className="text-destructive"
                          onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end text-sm font-semibold">Total : {formatFCFA(total)}</div>
                {kind === "facture" && (
                  <div className="space-y-1.5 max-w-xs ml-auto">
                    <Label>Déjà réglé</Label>
                    <MoneyInput value={form.paid} onChange={(v: number) => setForm({ ...form, paid: v })} />
                  </div>
                )}
              </div>
            )}

            {kind === "recu" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Montant reçu *</Label>
                  <MoneyInput value={form.amount} onChange={(v: number) => setForm({ ...form, amount: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode de paiement</Label>
                  <Input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Motif</Label>
                  <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Acompte, solde de facture…" className="rounded-xl" />
                </div>
              </div>
            )}

            {kind === "attestation" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Objet</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Attestation de vente" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contenu</Label>
                  <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                    className="rounded-xl" placeholder="Je soussigné(e)…" />
                </div>
              </div>
            )}

            {kind !== "attestation" && kind !== "bon" && (
              <>
                <div className="space-y-1.5">
                  <Label>Note / mention</Label>
                  <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded-xl" />
                </div>
                <SignaturePad
                  label="Signature du client (facultative)"
                  value={form.signature || undefined}
                  onChange={(v) => setForm({ ...form, signature: v || "" })}
                />
              </>
            )}
            {kind === "bon" && (
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded-xl" />
              </div>
            )}
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setKind(null)}>Annuler</Button>
            <Button className="rounded-xl gap-1.5" onClick={generate}>
              <Download size={15} /> Générer le PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ScrollText };
