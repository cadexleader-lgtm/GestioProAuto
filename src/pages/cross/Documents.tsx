import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "@/components/ui/money-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText, Download, Send, Search, Plus, Trash2, FileSpreadsheet, Receipt,
  ScrollText, FileSignature, RefreshCw, CalendarClock, ShieldAlert, FolderOpen,
  Wallet, Sparkles, Eye, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import { useCollection, db, getPrivateDocumentUrl, uploadPrivateDocument } from "@/lib/demo-store";
import { useRole } from "@/lib/roles";
import { useTenant } from "@/lib/tenant";
import { formatFCFA } from "@/lib/format";
import { useCompanyProfile } from "@/lib/company-profile";
import type { InvoiceLine } from "@/lib/pdf/templates";
import { sendWhatsApp } from "@/lib/whatsapp";
import { SignaturePad } from "@/components/ui/signature-pad";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { useFeatureFlags } from "@/lib/feature-flags";
import { toast } from "sonner";

/**
 * Types générables depuis cette page. Limité à ce qui sert réellement un
 * parc automobile (vente/location/crédit véhicule + RH) : bon de commande
 * (achat fournisseur générique) et attestation libre ont été retirés — sans
 * valeur ajoutée pour ce métier et redondants avec les contrats auto déjà
 * générés automatiquement (voir AUTO_TYPES).
 */
type DocKind = "facture" | "proforma" | "recu";

const PAYMENT_METHODS = ["Cash", "Wave", "Orange Money", "Virement", "Chèque"] as const;

const TYPES: { id: DocKind; label: string; description: string; icon: any; prefix: string; tint: string }[] = [
  { id: "facture",  label: "Facture",          description: "Prestation ou service facturé à un client", icon: FileSpreadsheet, prefix: "FAC", tint: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" },
  { id: "proforma", label: "Proforma / Devis",  description: "Estimation avant vente ou intervention",     icon: FileText,        prefix: "PRO", tint: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400" },
  { id: "recu",     label: "Reçu",              description: "Justificatif d'un encaissement",             icon: Receipt,         prefix: "REC", tint: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" },
];

/** Types archivés automatiquement par les modules métier (non générables depuis cette page). */
const AUTO_TYPES = [
  { id: "contrat-vente",    label: "Contrat de vente",    icon: FileSignature, prefix: "VTE", tint: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400" },
  { id: "contrat-location", label: "Contrat de location", icon: ScrollText,    prefix: "LOC", tint: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400" },
  { id: "contrat-credit",   label: "Échéancier crédit",   icon: ScrollText,    prefix: "CRE", tint: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400" },
  { id: "bulletin",         label: "Bulletin de paie",    icon: Receipt,       prefix: "PAI", tint: "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400" },
  { id: "piece",            label: "Pièce jointe",        icon: FileText,      prefix: "PJ",  tint: "bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300" },
] as const;

const ALL_TYPES: { id: string; label: string; icon: any; prefix: string; tint: string }[] = [
  ...TYPES, ...AUTO_TYPES.map((t) => ({ ...t })),
];

const PARTY_LABEL: Record<DocKind, string> = {
  facture: "Client",
  proforma: "Client",
  recu: "Reçu de",
};

const PARTY_REQUIRED_MESSAGE: Record<DocKind, string> = {
  facture: "Nom du client requis",
  proforma: "Nom du client requis",
  recu: "Nom du payeur requis",
};

const emptyLine = (): InvoiceLine => ({ designation: "", detail: "", qty: 1, unitPrice: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 20;

export function Documents() {
  const docs = useCollection("documents");
  const vehicles = useCollection("vehicles");
  const vehicleSales = useCollection("vehicleSales");
  const profile = useCompanyProfile();
  const role = useRole();
  const { company } = useTenant();
  const canAccessDocuments = role === "patron" || role === "manager";
  const flags = useFeatureFlags();
  const [kind, setKind] = useState<DocKind | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [migratingLegacy, setMigratingLegacy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<{ doc: any; url: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [filter, entity, expiringOnly, q]);

  const [form, setForm] = useState({
    party: "", phone: "", address: "", note: "", date: today(),
    lines: [emptyLine()], paid: 0, amount: 0, reason: "", method: "Cash",
    signature: "" as string,
  });

  const reset = () => setForm({
    party: "", phone: "", address: "", note: "", date: today(),
    lines: [emptyLine()], paid: 0, amount: 0, reason: "", method: "Cash",
    signature: "",
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

  const buildPdf = async (k: DocKind, reference: string, data: typeof form) => {
    const { pdfInvoice, pdfReceipt } = await import("@/lib/pdf/templates");
    const signatures = data.signature ? { client: data.signature } : undefined;
    if (k === "facture" || k === "proforma") {
      return pdfInvoice({
        reference, date: data.date, title: k === "proforma" ? "Facture proforma" : "Facture",
        customer: { name: data.party, phone: data.phone, address: data.address },
        lines: data.lines.filter((l) => l.designation),
        paid: k === "facture" ? data.paid : 0,
        note: data.note, signatures,
      });
    }
    return pdfReceipt({
      reference, date: data.date, payerName: data.party, amount: data.amount,
      reason: data.reason || "Règlement", method: data.method, signatures,
    });
  };

  const generate = async () => {
    if (!kind || generating) return;
    if (!form.party.trim()) return toast.error(PARTY_REQUIRED_MESSAGE[kind]);
    if (!company?.id) return toast.error("Aucune entreprise active n'est disponible.");
    const reference = nextRef(kind);
    const amount = kind === "recu" ? form.amount : total;

    setGenerating(true);
    try {
      const doc = await buildPdf(kind, reference, form);
      await uploadPrivateDocument({
        file: doc.toFile(`${kind}-${reference}.pdf`),
        type: kind,
        reference,
        title: `${TYPES.find((t) => t.id === kind)!.label} — ${form.party}`,
        relatedTo: form.party,
        amount,
        entityType: "company",
        entityId: company.id,
        entityLabel: form.party,
        relationType: "generated_document",
        origin: "Généré",
        metadata: { ...form },
      });
      toast.success(`${reference} généré et archivé`);
      setKind(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le document n'a pas pu être archivé.");
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async (d: any) => {
    if (d.payload) await buildPdf(d.type as DocKind, d.reference, d.payload);
    else toast.error("Document sans données source");
  };

  const isPayrollDocument = (d: any) => {
    const payload = d.payload ?? {};
    return d.type === "bulletin"
      || Boolean(d.payslipId ?? payload.payslipId)
      || Boolean(
        (d.employeeId ?? payload.employeeId)
        && (d.paymentId ?? d.payment_id ?? payload.paymentId ?? payload.payment_id),
      );
  };

  const legacyDocumentId = (...parts: Array<string | undefined>) =>
    parts
      .filter(Boolean)
      .join("-")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

  const dataUrlToFile = async (dataUrl: string, name: string, type?: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], name || "document", { type: type || blob.type || "application/octet-stream" });
  };

  const removeDocument = async (d: any) => {
    if (isPayrollDocument(d) || deletingId) return;
    setDeletingId(d.id);
    try {
      await db.removeConfirmed("documents", d.id);
      toast.success("Document supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le document n'a pas été supprimé.");
    } finally {
      setDeletingId(null);
    }
  };

  // Pièces jointes rattachées aux véhicules (carte grise, assurance, visite…)
  const downloadDocument = async (d: any) => {
    try {
      const a = document.createElement("a");
      a.href = await getPrivateDocumentUrl(d);
      a.download = d.originalName || d.reference || d.title || "document";
      a.click();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléchargement indisponible.");
    }
  };

  const openPreview = async (d: any) => {
    if (previewLoadingId) return;
    setPreviewLoadingId(d.id);
    try {
      // 5 min — assez pour consulter le document dans la fenêtre d'aperçu,
      // contrairement au lien de téléchargement (60 s) qui n'a besoin de
      // vivre que le temps du clic.
      const url = await getPrivateDocumentUrl(d, 300);
      setPreview({ doc: d, url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aperçu indisponible.");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const legacyVehicleDocsCount = useMemo(
    () => vehicles.reduce((count: number, v: any) => count + (v.documents ?? []).filter((f: any) => f.dataUrl).length, 0),
    [vehicles],
  );

  const legacySaleDocsCount = useMemo(
    () => vehicleSales.reduce((count: number, s: any) => count + (s.documents ?? []).filter((f: any) => f.dataUrl).length, 0),
    [vehicleSales],
  );

  const legacyBase64Count = legacyVehicleDocsCount + legacySaleDocsCount;

  const migrateLegacyBase64Documents = async () => {
    if (!canAccessDocuments || migratingLegacy || legacyBase64Count === 0) return;

    setMigratingLegacy(true);
    let migrated = 0;
    let failed = 0;

    try {
      for (const vehicle of vehicles as any[]) {
        const legacyDocs = (vehicle.documents ?? []) as any[];
        if (!legacyDocs.some((doc) => doc.dataUrl)) continue;

        const keptDocs: any[] = [];

        for (const doc of legacyDocs) {
          if (!doc.dataUrl) {
            keptDocs.push(doc);
            continue;
          }

          try {
            const file = await dataUrlToFile(doc.dataUrl, doc.name, doc.type);
            await uploadPrivateDocument({
              file,
              documentId: legacyDocumentId("legacy", "vehicle", vehicle.id, doc.id),
              type: "piece",
              title: doc.name,
              reference: doc.name,
              relatedTo: vehicle.plate,
              entityType: "vehicle",
              entityId: vehicle.id,
              entityLabel: `${vehicle.brand} ${vehicle.model}${vehicle.plate ? ` (${vehicle.plate})` : ""}`,
              relationType: "legacy_vehicle_attachment",
              expiresAt: doc.expiresAt,
              origin: "Importé",
              metadata: {
                migratedFrom: "vehicles.data.documents",
                legacyDocumentId: doc.id,
                vehicleId: vehicle.id,
                vehiclePlate: vehicle.plate,
              },
            });
            migrated += 1;
          } catch (error) {
            failed += 1;
            keptDocs.push(doc);
            console.error("[gestiopro] legacy vehicle document migration failed", error);
          }
        }

        db.update("vehicles", vehicle.id, { documents: keptDocs } as any);
      }

      for (const sale of vehicleSales as any[]) {
        const legacyDocs = (sale.documents ?? []) as any[];
        if (!legacyDocs.some((doc) => doc.dataUrl)) continue;

        const nextDocs: any[] = [];

        for (const doc of legacyDocs) {
          if (!doc.dataUrl) {
            nextDocs.push(doc);
            continue;
          }

          try {
            const file = await dataUrlToFile(doc.dataUrl, doc.name, doc.type);
            const archived = await uploadPrivateDocument({
              file,
              documentId: legacyDocumentId("legacy", "sale", sale.id, doc.id),
              type: "piece",
              title: doc.name,
              reference: doc.name,
              relatedTo: sale.customer,
              entityType: "sale",
              entityId: sale.id,
              entityLabel: sale.customer,
              relationType: "legacy_sale_attachment",
              origin: "Importé",
              metadata: {
                migratedFrom: "vehicle_sales.data.documents",
                legacyDocumentId: doc.id,
                saleId: sale.id,
                vehicleId: sale.vehicleId,
                customer: sale.customer,
              },
            });
            nextDocs.push({
              id: doc.id,
              name: doc.name,
              type: doc.type,
              uploadedAt: doc.uploadedAt,
              size: doc.size,
              storageBucket: archived.storageBucket,
              storagePath: archived.storagePath,
            });
            migrated += 1;
          } catch (error) {
            failed += 1;
            nextDocs.push(doc);
            console.error("[gestiopro] legacy sale document migration failed", error);
          }
        }

        db.update("vehicleSales", sale.id, { documents: nextDocs } as any);
      }

      if (migrated > 0) toast.success(`${migrated} ancien(s) fichier(s) Base64 migré(s) vers le coffre privé.`);
      if (failed > 0) toast.error(`${failed} fichier(s) n'ont pas pu être migrés et restent inchangés.`);
      if (migrated === 0 && failed === 0) toast.info("Aucun ancien fichier Base64 à migrer.");
    } finally {
      setMigratingLegacy(false);
    }
  };

  const vehicleDocs = useMemo(
    () => vehicles.flatMap((v: any) =>
      (v.documents ?? []).filter((f: any) => f.dataUrl).map((f: any) => ({
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

  const monthDocs = allDocs.filter((d) => (d.createdAt || "").slice(0, 7) === today().slice(0, 7));
  const monthTotal = monthDocs.reduce((s, d) => s + (d.amount || 0), 0);

  // Documents sensibles (bulletins de paie) séparés des documents généraux :
  // même s'ils partagent les mêmes filtres, ils s'affichent dans une archive
  // à part, clairement identifiée, pour éviter de les mélanger aux factures/
  // contrats courants pendant qu'on parcourt les archives.
  const filteredGeneral = filtered.filter((d) => !isPayrollDocument(d));
  const filteredPayroll = filtered.filter((d) => isPayrollDocument(d));

  const totalPages = Math.max(1, Math.ceil(filteredGeneral.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedGeneral = filteredGeneral.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isLineDoc = kind === "facture" || kind === "proforma";

  const renderDocRow = (d: any) => {
    const t = ALL_TYPES.find((x) => x.id === d.type);
    const Icon = t?.icon ?? FileText;
    const n = daysLeft(d);
    const isAuto = !TYPES.some((x) => x.id === d.type);
    const isPayroll = isPayrollDocument(d);
    return (
      <div key={d.id} className="flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
        <div className={`w-10 h-10 rounded-xl ${t?.tint ?? "bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300"} flex items-center justify-center shrink-0`}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{d.reference}</p>
          <p className="text-xs text-muted-foreground truncate">
            {d.title} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}
            {d.entityLabel ? ` · ${d.entityLabel}` : ""}
          </p>
        </div>
        {n !== null && (
          <Badge variant="outline"
            className={`hidden sm:inline-flex rounded-lg text-[11px] ${n < 0 ? "border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400" : n <= 30 ? "border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400" : "border-slate-200 dark:border-border"}`}>
            {n < 0 ? `Expiré (${-n} j)` : `Expire dans ${n} j`}
          </Badge>
        )}
        <p className="font-bold text-sm hidden sm:block whitespace-nowrap">{d.amount ? formatFCFA(d.amount) : "—"}</p>
        <div className="flex gap-0.5 shrink-0">
          {(d.dataUrl || d.storagePath) && (
            <Button size="icon" variant="ghost" title="Aperçu" disabled={previewLoadingId === d.id}
              onClick={() => void openPreview(d)}>
              <Eye size={15} />
            </Button>
          )}
          {d.dataUrl || d.storagePath ? (
            <Button size="icon" variant="ghost" title="Télécharger" onClick={() => downloadDocument(d)}>
              <Download size={15} />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" title={isAuto ? "PDF disponible depuis le module d'origine" : "Retélécharger le PDF"}
              disabled={isAuto} onClick={() => regenerate(d)}>
              <Download size={15} />
            </Button>
          )}
          {!isAuto && !isPayroll && (
            <Button size="icon" variant="ghost" title="Régénérer" onClick={() => regenerate(d)}>
              <RefreshCw size={15} />
            </Button>
          )}
          {!isPayroll && (
            <Button size="icon" variant="ghost" title="Envoyer par WhatsApp"
              onClick={() => sendWhatsApp(d.payload?.phone || "", `Bonjour, voici votre document ${d.reference}.`)}>
              <Send size={15} />
            </Button>
          )}
          {d.origin !== "Importé" && !isPayroll && (
            <Button size="icon" variant="ghost" className="text-destructive" title="Supprimer"
              disabled={deletingId === d.id}
              onClick={() => void removeDocument(d)}>
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!canAccessDocuments) {
    return <RestrictedAccess title="Documents" message="Accès aux documents restreint à votre rôle." />;
  }
  if (!flags.documents) {
    return <RestrictedAccess title="Documents" message="Ce module est désactivé pour votre entreprise. Un patron peut le réactiver dans Paramètres." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Générez des PDF professionnels à votre image et retrouvez toutes vos archives.
          </p>
        </div>
        {!profile.name && (
          <Badge variant="outline" className="rounded-xl border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400">
            Complétez l'identité de l'entreprise dans Paramètres
          </Badge>
        )}
      </div>

      {/* Indicateurs — vue d'ensemble en un coup d'œil */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FolderOpen} label="Documents" value={String(allDocs.length)} tone="blue" />
        <StatCard icon={Sparkles} label="Générés ce mois-ci" value={String(monthDocs.length)} tone="indigo" />
        <StatCard icon={Wallet} label="Montant ce mois-ci" value={formatFCFA(monthTotal)} tone="emerald" />
        <StatCard icon={CalendarClock} label="Expirent sous 30 j" value={String(expiringCount)} tone={expiringCount > 0 ? "amber" : "slate"} />
      </div>

      {/* Générateurs */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display font-semibold text-lg">Générer un document</h2>
          <p className="text-sm text-muted-foreground">Un modèle, votre identité d'entreprise appliquée automatiquement.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const count = docs.filter((d) => d.type === t.id).length;
            return (
              <button key={t.id} onClick={() => open(t.id)}
                className="group text-left rounded-2xl border bg-card p-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl ${t.tint} flex items-center justify-center`}>
                    <Icon size={19} />
                  </div>
                  <Plus size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="font-semibold text-sm mt-3 leading-tight">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  {count} document{count > 1 ? "s" : ""} généré{count > 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Archives */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="p-5 space-y-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold">Archives</h3>
                <p className="text-xs text-muted-foreground">{filteredGeneral.length} document(s) affiché(s)</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une référence, un client…" className="pl-9 rounded-xl" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select value={entity} onChange={(e) => setEntity(e.target.value)}
                className="h-9 rounded-xl border bg-background px-3 text-sm">
                <option value="all">Toutes les entités</option>
                {entityOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              <Button variant={expiringOnly ? "default" : "outline"} size="sm" className="rounded-xl gap-1.5"
                onClick={() => setExpiringOnly((v) => !v)}>
                <CalendarClock size={14} /> Expire &lt; 30 j{expiringCount ? ` (${expiringCount})` : ""}
              </Button>
              {legacyBase64Count > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  disabled={migratingLegacy}
                  onClick={() => void migrateLegacyBase64Documents()}
                >
                  <RefreshCw size={14} />
                  {migratingLegacy ? "Migration..." : `Migrer Base64 (${legacyBase64Count})`}
                </Button>
              )}
              <div className="flex-1" />
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="rounded-xl overflow-x-auto max-w-full">
                  <TabsTrigger value="all" className="rounded-lg text-xs">Tous</TabsTrigger>
                  {ALL_TYPES.map((t) => (
                    <TabsTrigger key={t.id} value={t.id} className="rounded-lg text-xs">{t.prefix}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="divide-y">
            {filteredGeneral.length === 0 && (
              <div className="p-12 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <FolderOpen size={20} />
                </div>
                <p className="text-sm font-medium">Aucun document</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {q || entity !== "all" || filter !== "all" || expiringOnly
                    ? "Aucun résultat pour ces filtres — essayez de les réinitialiser."
                    : "Choisissez un modèle ci-dessus pour générer votre premier document."}
                </p>
              </div>
            )}
            {pagedGeneral.map((d: any) => renderDocRow(d))}
          </div>

          {filteredGeneral.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 p-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} sur {totalPages} · {filteredGeneral.length} document(s)
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="icon" className="rounded-xl" disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={15} />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl" disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archives RH — séparées, jamais mélangées aux documents généraux */}
      {filteredPayroll.length > 0 && (
        <Card className="shadow-sm border-amber-200 dark:border-amber-800/40">
          <CardContent className="p-0">
            <div className="p-5 border-b bg-amber-50/40 dark:bg-amber-950/20 rounded-t-xl">
              <h3 className="font-display font-semibold inline-flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <ShieldAlert size={16} /> Bulletins de paie (RH — sensible)
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                {filteredPayroll.length} document(s) · visibles uniquement par patron/manager, non modifiables, non supprimables.
              </p>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {filteredPayroll.map((d: any) => renderDocRow(d))}
            </div>
          </CardContent>
        </Card>
      )}

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
                <Label>{kind ? PARTY_LABEL[kind] : "Destinataire"} *</Label>
                <Input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} placeholder="Nom complet" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl" />
              </div>
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
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Motif</Label>
                  <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Acompte, solde de facture…" className="rounded-xl" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Note / mention</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded-xl" />
            </div>
            <SignaturePad
              label="Signature du client (facultative)"
              value={form.signature || undefined}
              onChange={(v) => setForm({ ...form, signature: v || "" })}
            />
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setKind(null)} disabled={generating}>Annuler</Button>
            <Button className="rounded-xl gap-1.5" onClick={generate} disabled={generating}>
              <Download size={15} /> {generating ? "Génération..." : "Générer le PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aperçu inline */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.doc.reference} — {preview?.doc.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-xl border bg-muted/30 overflow-hidden">
            {preview && (
              (preview.doc.mimeType || "").startsWith("image/") ? (
                <img src={preview.url} alt={preview.doc.title} className="w-full h-full object-contain" />
              ) : (
                <iframe src={preview.url} title={preview.doc.title} className="w-full h-full" />
              )
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => preview && window.open(preview.url, "_blank")}>
              <ExternalLink size={15} /> Ouvrir dans un onglet
            </Button>
            <Button className="rounded-xl gap-1.5" onClick={() => preview && downloadDocument(preview.doc)}>
              <Download size={15} /> Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: string; tone: "blue" | "indigo" | "emerald" | "amber" | "slate";
}) {
  const tones: Record<typeof tone, string> = {
    blue: "from-white to-blue-50 border-blue-200/70 text-blue-700 dark:from-card dark:to-card dark:border-border dark:text-blue-400",
    indigo: "from-white to-indigo-50 border-indigo-200/70 text-indigo-700 dark:from-card dark:to-card dark:border-border dark:text-indigo-400",
    emerald: "from-white to-emerald-50 border-emerald-200/70 text-emerald-700 dark:from-card dark:to-card dark:border-border dark:text-emerald-400",
    amber: "from-white to-amber-50 border-amber-200/70 text-amber-700 dark:from-card dark:to-card dark:border-border dark:text-amber-400",
    slate: "from-white to-slate-50 border-slate-200/70 text-slate-600 dark:from-card dark:to-card dark:border-border dark:text-muted-foreground",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-background/60 flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className="font-display font-bold text-base leading-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export { ScrollText };
