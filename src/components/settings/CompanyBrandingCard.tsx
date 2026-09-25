import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Building2, Upload, Trash2, Save, FileText, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";
import {
  useCompanyProfile,
  saveCompanyProfile,
  EMPTY_PROFILE,
  type CompanyProfile,
} from "@/lib/company-profile";

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Éditeur d'articles numérotés pour un type de contrat (vente/location/crédit). */
function ArticlesEditor({ articles, onChange }: { articles: string[]; onChange: (next: string[]) => void }) {
  const add = () => onChange([...articles, ""]);
  const update = (i: number, v: string) => onChange(articles.map((a, idx) => (idx === i ? v : a)));
  const remove = (i: number) => onChange(articles.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {articles.map((a, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-2.5 shrink-0 w-20 text-xs font-bold text-muted-foreground">Article {i + 1}</span>
          <Textarea
            rows={2}
            className="rounded-xl flex-1"
            value={a}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Texte de l'article…"
          />
          <Button type="button" variant="ghost" size="icon" className="shrink-0 mt-0.5 text-destructive" onClick={() => remove(i)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={add}>
        <Plus size={14} /> Ajouter un article
      </Button>
      {articles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucun article renseigné — le texte par défaut du modèle sera imprimé sur ce contrat.
        </p>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  );
}

export function CompanyBrandingCard() {
  const saved = useCompanyProfile();
  const [p, setP] = useState<CompanyProfile>(saved);
  const [dirty, setDirty] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!dirty) setP(saved); }, [saved, dirty]);

  const set = (patch: Partial<CompanyProfile>) => { setP((prev) => ({ ...prev, ...patch })); setDirty(true); };

  const save = () => { saveCompanyProfile(p); setDirty(false); toast.success("Identité de l'entreprise enregistrée"); };

  const preview = async () => {
    saveCompanyProfile(p);
    setDirty(false);
    const { pdfInvoice } = await import("@/lib/pdf/templates");
    pdfInvoice({
      reference: "APERCU-001",
      customer: { name: "Client de démonstration", phone: "+229 00 00 00 00" },
      lines: [
        { designation: "Article exemple", detail: "Aperçu de mise en page", qty: 2, unitPrice: 125000 },
        { designation: "Prestation exemple", qty: 1, unitPrice: 75000 },
      ],
      paid: 100000,
      note: "Document d'aperçu généré depuis les paramètres.",
    });
  };

  const onLogo = async (f?: File | null) => {
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) return toast.error("Logo trop lourd (max 1,5 Mo)");
    set({ logoDataUrl: await readImage(f) });
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="flex items-center gap-2"><Building2 size={18} /> Identité & documents</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={preview}>
            <FileText size={14} /> Aperçu PDF
          </Button>
          <Button type="button" size="sm" className="rounded-xl gap-1.5" onClick={save} disabled={!dirty}>
            <Save size={14} /> Enregistrer
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="identity">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto gap-1 rounded-xl">
            <TabsTrigger value="identity" className="rounded-lg text-xs">Identité</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg text-xs">Contact</TabsTrigger>
            <TabsTrigger value="legal" className="rounded-lg text-xs">Légal</TabsTrigger>
            <TabsTrigger value="bank" className="rounded-lg text-xs">Paiement</TabsTrigger>
            <TabsTrigger value="docs" className="rounded-lg text-xs">Documents</TabsTrigger>
            <TabsTrigger value="contracts" className="rounded-lg text-xs">Contrats</TabsTrigger>
          </TabsList>

          {/* IDENTITÉ */}
          <TabsContent value="identity" className="mt-5 space-y-5">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-border flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-muted shrink-0">
                {p.logoDataUrl
                  ? <img src={p.logoDataUrl} alt="Logo de l'entreprise" className="w-full h-full object-contain p-2" />
                  : <Building2 size={28} className="text-slate-300" />}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Logo de l'entreprise</p>
                <p className="text-xs text-muted-foreground max-w-sm">PNG ou JPG, fond transparent recommandé. Il apparaît en en-tête de tous vos documents.</p>
                <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => void onLogo(e.target.files?.[0])} />
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => logoInput.current?.click()}>
                    <Upload size={14} /> Choisir
                  </Button>
                  {p.logoDataUrl && (
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl gap-1.5 text-destructive" onClick={() => set({ logoDataUrl: "" })}>
                      <Trash2 size={14} /> Retirer
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Raison sociale" value={p.name} onChange={(v) => set({ name: v })} placeholder="GestioPro SARL" />
              <Field label="Forme juridique" value={p.legalForm} onChange={(v) => set({ legalForm: v })} placeholder="SARL, SA, EI…" />
              <Field label="Slogan" value={p.slogan} onChange={(v) => set({ slogan: v })} placeholder="Votre partenaire de confiance" />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Couleur des documents</Label>
                <div className="flex gap-2">
                  <input type="color" value={p.accentColor || "#2563eb"} onChange={(e) => set({ accentColor: e.target.value })} className="h-10 w-14 rounded-xl border border-input bg-background p-1" />
                  <Input value={p.accentColor} onChange={(e) => set({ accentColor: e.target.value })} className="rounded-xl" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CONTACT */}
          <TabsContent value="contact" className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Adresse" value={p.address} onChange={(v) => set({ address: v })} placeholder="Rue 12, Quartier Zongo" />
            <Field label="Ville" value={p.city} onChange={(v) => set({ city: v })} />
            <Field label="Pays" value={p.country} onChange={(v) => set({ country: v })} />
            <Field label="Téléphone principal" value={p.phone} onChange={(v) => set({ phone: v })} />
            <Field label="Téléphone secondaire" value={p.phone2} onChange={(v) => set({ phone2: v })} />
            <Field label="WhatsApp" value={p.whatsapp} onChange={(v) => set({ whatsapp: v })} />
            <Field label="Email" type="email" value={p.email} onChange={(v) => set({ email: v })} />
            <Field label="Site web" value={p.website} onChange={(v) => set({ website: v })} />
            <Field label="Facebook" value={p.facebook} onChange={(v) => set({ facebook: v })} />
            <Field label="Instagram" value={p.instagram} onChange={(v) => set({ instagram: v })} />
          </TabsContent>

          {/* LÉGAL */}
          <TabsContent value="legal" className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="RCCM" value={p.rccm} onChange={(v) => set({ rccm: v })} />
            <Field label="IFU / NIF" value={p.ifu} onChange={(v) => set({ ifu: v })} />
            <Field label="Numéro fiscal" value={p.taxNumber} onChange={(v) => set({ taxNumber: v })} />
            <Field label="Devise" value={p.currency} onChange={(v) => set({ currency: v })} placeholder="FCFA" />
          </TabsContent>

          {/* PAIEMENT */}
          <TabsContent value="bank" className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Banque" value={p.bankName} onChange={(v) => set({ bankName: v })} />
            <Field label="Numéro de compte" value={p.bankAccount} onChange={(v) => set({ bankAccount: v })} />
            <Field label="IBAN" value={p.bankIban} onChange={(v) => set({ bankIban: v })} />
            <Field label="Code SWIFT / BIC" value={p.bankSwift} onChange={(v) => set({ bankSwift: v })} />
            <Field label="Mobile Money" value={p.mobileMoney} onChange={(v) => set({ mobileMoney: v })} placeholder="MTN / Moov / Wave" />
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="docs" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SignaturePad
                label="Signature du responsable"
                value={p.signatureDataUrl || undefined}
                onChange={(v) => set({ signatureDataUrl: v || "" })}
              />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Cachet / tampon (image)</Label>
                <div className="h-[150px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-border bg-slate-50 dark:bg-muted flex items-center justify-center overflow-hidden">
                  {p.stampDataUrl
                    ? <img src={p.stampDataUrl} alt="Cachet de l'entreprise" className="max-h-full object-contain p-2" />
                    : <span className="text-xs text-muted-foreground">Aucun cachet</span>}
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex">
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) set({ stampDataUrl: await readImage(f) });
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm cursor-pointer hover:bg-muted">
                      <Upload size={14} /> Importer
                    </span>
                  </label>
                  {p.stampDataUrl && (
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={() => set({ stampDataUrl: "" })}>
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Conditions générales (factures/reçus, et repli des contrats sans articles)</Label>
              <Textarea rows={4} className="rounded-xl" value={p.terms} onChange={(e) => set({ terms: e.target.value })}
                placeholder="Marchandises vendues ne sont ni reprises ni échangées. Paiement à réception de facture…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Pied de page des documents</Label>
              <Input className="rounded-xl" value={p.documentFooter} onChange={(e) => set({ documentFooter: e.target.value })}
                placeholder="Merci de votre confiance — GestioPro" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <Button type="button" variant="ghost" size="sm" className="text-destructive rounded-xl"
                onClick={() => { setP({ ...EMPTY_PROFILE }); setDirty(true); }}>
                Réinitialiser l'identité
              </Button>
            </div>
          </TabsContent>

          {/* CONTRATS — articles numerotes distincts par type de contrat */}
          <TabsContent value="contracts" className="mt-5 space-y-6">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <ScrollText size={14} className="shrink-0 mt-0.5 text-primary" />
              Chaque type de contrat a ses propres clauses, imprimées sous forme d'articles numérotés
              (« Article 1. », « Article 2. »…). Un contrat sans article utilise le texte générique
              de l'onglet Documents.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Contrat de vente (comptant)</Label>
              <ArticlesEditor
                articles={p.contractArticles.vente}
                onChange={(next) => set({ contractArticles: { ...p.contractArticles, vente: next } })}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold">Contrat de location</Label>
              <ArticlesEditor
                articles={p.contractArticles.location}
                onChange={(next) => set({ contractArticles: { ...p.contractArticles, location: next } })}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold">Contrat de vente à crédit</Label>
              <ArticlesEditor
                articles={p.contractArticles.credit}
                onChange={(next) => set({ contractArticles: { ...p.contractArticles, credit: next } })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
