/**
 * GestioPro — Moteur de génération de documents PDF professionnels.
 * Un seul moteur, utilisé par tous les modèles (contrats, factures, reçus,
 * bons de commande, attestations, rapports).
 *
 * Client-only : importer dynamiquement depuis les composants.
 */
import jsPDF from "jspdf";
import { getCompanyProfile, type CompanyProfile } from "@/lib/company-profile";

export const PAGE = { w: 210, h: 297, ml: 16, mr: 16, top: 14, bottom: 20 };

export type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [37, 99, 235];
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

/**
 * `formatFCFA()`/`toLocaleString("fr-FR")` séparent les milliers avec un espace
 * insécable fine (U+202F) — un vrai espace en HTML/CSS, mais absent des polices
 * standard jsPDF ("helvetica" = WinAnsi) : le montant s'affichait "20/000" au
 * lieu de "20 000" (glyphe de repli mal rendu). Patché une seule fois ici,
 * sur l'instance jsPDF elle-même, plutôt que dans chaque appel de `d.text()`
 * du fichier (et de vehicle-pdf.ts/templates.ts) — corrige tous les montants,
 * dates et libellés d'un coup, présents et futurs.
 */
function sanitizeJsPdfSpaces(doc: jsPDF) {
  const stripUnsupportedSpaces = (s: string) => s.replace(/[    ⁠]/g, " ");
  const originalText = doc.text.bind(doc);
  (doc as any).text = (text: unknown, ...rest: unknown[]) => {
    const clean = Array.isArray(text)
      ? text.map((t) => (typeof t === "string" ? stripUnsupportedSpaces(t) : t))
      : typeof text === "string" ? stripUnsupportedSpaces(text) : text;
    return (originalText as any)(clean, ...rest);
  };
  const originalGetTextWidth = doc.getTextWidth.bind(doc);
  (doc as any).getTextWidth = (text: string) =>
    originalGetTextWidth(typeof text === "string" ? stripUnsupportedSpaces(text) : text);
  const originalSplitText = doc.splitTextToSize.bind(doc);
  (doc as any).splitTextToSize = (text: string, maxWidth: number, opts?: unknown) =>
    originalSplitText(typeof text === "string" ? stripUnsupportedSpaces(text) : text, maxWidth, opts);
}

export interface DocMeta {
  /** Ex: "CONTRAT DE VENTE" */
  title: string;
  /** Ex: "CV-2026-0001" */
  reference?: string;
  date?: string;
  subtitle?: string;
  /** Mention discrète en haut à droite (ex: "Original") */
  tag?: string;
}

export interface Party {
  heading: string;
  lines: string[];
}

export interface KV { label: string; value: string }

export interface TableCol {
  header: string;
  /** largeur en mm */
  width: number;
  align?: "left" | "right" | "center";
}

export interface SignatureSlot {
  label: string;
  name?: string;
  dataUrl?: string;
}

const GREY: RGB = [100, 116, 139];
const DARK: RGB = [15, 23, 42];
const LINE: RGB = [226, 232, 240];
const SOFT: RGB = [248, 250, 252];

export class PdfDoc {
  doc: jsPDF;
  y = PAGE.top;
  accent: RGB;
  profile: CompanyProfile;
  private footerText: string;

  constructor(profile?: CompanyProfile) {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.profile = profile ?? getCompanyProfile();
    this.accent = hexToRgb(this.profile.accentColor || "#2563eb");
    this.footerText = this.profile.documentFooter || "";
    this.doc.setFont("helvetica", "normal");
    sanitizeJsPdfSpaces(this.doc);
  }

  get contentW() { return PAGE.w - PAGE.ml - PAGE.mr; }

  /* ---------------- primitives ---------------- */

  private ensure(space: number) {
    if (this.y + space > PAGE.h - PAGE.bottom) this.addPage();
  }

  addPage() {
    this.doc.addPage();
    this.y = PAGE.top;
    this.compactHeader();
  }

  private compactHeader() {
    const d = this.doc;
    d.setFillColor(...this.accent);
    d.rect(0, 0, PAGE.w, 3, "F");
    d.setFontSize(8);
    d.setTextColor(...GREY);
    d.setFont("helvetica", "bold");
    d.text((this.profile.name || "GestioAuto").toUpperCase(), PAGE.ml, 9);
    this.y = 16;
  }

  /* ---------------- header ---------------- */

  header(meta: DocMeta) {
    const d = this.doc;
    const p = this.profile;

    // bandeau
    d.setFillColor(...this.accent);
    d.rect(0, 0, PAGE.w, 34, "F");

    let textX = PAGE.ml;
    if (p.logoDataUrl) {
      try {
        d.addImage(p.logoDataUrl, PAGE.ml, 6, 22, 22, undefined, "FAST");
        textX = PAGE.ml + 27;
      } catch { /* logo illisible : on ignore */ }
    }

    // Répartit l'espace du bandeau entre le bloc identité (gauche, largeur
    // variable — nom/adresse d'entreprise saisis par l'utilisateur) et le
    // bloc titre/référence (droite, aligné à droite) : sans ceci, un nom
    // d'entreprise long débordait largement du bandeau et chevauchait le
    // titre du document (aucun clip() n'était appliqué ici auparavant).
    const availW = PAGE.w - PAGE.mr - textX;
    const leftMaxW = Math.max(40, availW * 0.56 - 4);
    const rightMaxW = Math.max(40, availW * 0.44 - 4);

    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold");
    d.setFontSize(16);
    d.text(this.clip(p.name || "Votre entreprise", leftMaxW), textX, 14);

    d.setFont("helvetica", "normal");
    d.setFontSize(7.6);
    const contact = [
      [p.address, p.city, p.country].filter(Boolean).join(", "),
      [p.phone, p.phone2].filter(Boolean).join(" · "),
      [p.email, p.website].filter(Boolean).join(" · "),
    ].filter(Boolean);
    contact.forEach((l, i) => d.text(this.clip(l, leftMaxW), textX, 20 + i * 4));

    // bloc titre à droite
    d.setFont("helvetica", "bold");
    d.setFontSize(13);
    d.text(this.clip(meta.title.toUpperCase(), rightMaxW), PAGE.w - PAGE.mr, 13, { align: "right" });
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    const right: string[] = [];
    if (meta.reference) right.push(`N° ${meta.reference}`);
    if (meta.date) right.push(meta.date);
    if (meta.subtitle) right.push(meta.subtitle);
    right.forEach((l, i) => d.text(this.clip(l, rightMaxW), PAGE.w - PAGE.mr, 19 + i * 4, { align: "right" }));

    this.y = 44;
    d.setTextColor(...DARK);

    if (meta.tag) {
      d.setFontSize(7);
      d.setTextColor(...GREY);
      d.text(this.clip(meta.tag, rightMaxW), PAGE.w - PAGE.mr, 40, { align: "right" });
      d.setTextColor(...DARK);
    }
  }

  /* ---------------- blocks ---------------- */

  sectionTitle(label: string) {
    this.ensure(14);
    const d = this.doc;
    d.setFillColor(...this.accent);
    d.rect(PAGE.ml, this.y - 3.6, 2.2, 5.6, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(9.5);
    d.setTextColor(...DARK);
    d.text(label.toUpperCase(), PAGE.ml + 5, this.y);
    d.setDrawColor(...LINE);
    d.setLineWidth(0.2);
    d.line(PAGE.ml + 5 + d.getTextWidth(label.toUpperCase()) + 3, this.y - 1, PAGE.w - PAGE.mr, this.y - 1);
    this.y += 6;
  }

  /** Deux cartes côte à côte (ex: Vendeur / Acheteur). */
  parties(list: Party[]) {
    const d = this.doc;
    const gap = 5;
    const count = Math.max(1, list.length);
    const w = (this.contentW - gap * (count - 1)) / count;
    const bodyLines = list.map((p) => p.lines.filter(Boolean));
    const rows = Math.max(...bodyLines.map((l) => l.length), 1);
    const h = 10 + rows * 4.4 + 4;
    this.ensure(h + 4);

    list.forEach((p, i) => {
      const x = PAGE.ml + i * (w + gap);
      d.setFillColor(...SOFT);
      d.setDrawColor(...LINE);
      d.roundedRect(x, this.y, w, h, 2, 2, "FD");
      d.setFont("helvetica", "bold");
      d.setFontSize(7.4);
      d.setTextColor(...this.accent);
      d.text(p.heading.toUpperCase(), x + 4, this.y + 6);
      d.setTextColor(...DARK);
      d.setFontSize(8.6);
      (bodyLines[i] ?? []).forEach((l, j) => {
        d.setFont("helvetica", j === 0 ? "bold" : "normal");
        d.text(this.clip(l, w - 8), x + 4, this.y + 12 + j * 4.4);
      });
    });
    this.y += h + 6;
  }

  /** Grille d'informations clé/valeur, 2 colonnes. */
  keyValues(items: KV[], cols = 2) {
    const d = this.doc;
    const colW = this.contentW / cols;
    const rows = Math.ceil(items.length / cols);
    this.ensure(rows * 6 + 4);
    items.forEach((kv, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = PAGE.ml + c * colW;
      const yy = this.y + r * 6;
      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      d.setTextColor(...GREY);
      d.text(kv.label, x, yy);
      d.setFont("helvetica", "bold");
      d.setFontSize(8.6);
      d.setTextColor(...DARK);
      d.text(this.clip(kv.value || "—", colW - 4), x + colW - 4, yy, { align: "right" });
    });
    this.y += rows * 6 + 4;
  }

  table(cols: TableCol[], rows: string[][], opts?: { zebra?: boolean }) {
    const d = this.doc;
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    const scale = this.contentW / totalW;
    const widths = cols.map((c) => c.width * scale);

    const drawHead = () => {
      this.ensure(12);
      d.setFillColor(...this.accent);
      d.rect(PAGE.ml, this.y, this.contentW, 7.5, "F");
      d.setFont("helvetica", "bold");
      d.setFontSize(8);
      d.setTextColor(255, 255, 255);
      let x = PAGE.ml;
      cols.forEach((c, i) => {
        const w = widths[i]!;
        const align = c.align ?? "left";
        const tx = align === "right" ? x + w - 2.5 : align === "center" ? x + w / 2 : x + 2.5;
        d.text(this.clip(c.header, w - 5), tx, this.y + 5, { align });
        x += w;
      });
      this.y += 7.5;
    };

    drawHead();
    d.setTextColor(...DARK);
    rows.forEach((r, ri) => {
      if (this.y + 7 > PAGE.h - PAGE.bottom) { this.addPage(); drawHead(); }
      if ((opts?.zebra ?? true) && ri % 2 === 1) {
        d.setFillColor(...SOFT);
        d.rect(PAGE.ml, this.y, this.contentW, 6.6, "F");
      }
      d.setFont("helvetica", "normal");
      d.setFontSize(8.2);
      d.setTextColor(...DARK);
      let x = PAGE.ml;
      cols.forEach((c, i) => {
        const w = widths[i]!;
        const align = c.align ?? "left";
        const tx = align === "right" ? x + w - 2.5 : align === "center" ? x + w / 2 : x + 2.5;
        d.text(this.clip(r[i] ?? "", w - 5), tx, this.y + 4.6, { align });
        x += w;
      });
      this.y += 6.6;
      d.setDrawColor(...LINE);
      d.line(PAGE.ml, this.y, PAGE.w - PAGE.mr, this.y);
    });
    this.y += 6;
  }

  /** Bloc totaux aligné à droite, dernière ligne mise en avant. */
  totals(items: KV[], highlightLast = true) {
    const d = this.doc;
    const w = 88;
    const x = PAGE.w - PAGE.mr - w;
    const h = items.length * 6.4 + 6;
    this.ensure(h + 4);
    d.setDrawColor(...LINE);
    d.setFillColor(...SOFT);
    d.roundedRect(x, this.y, w, h, 2, 2, "FD");
    items.forEach((kv, i) => {
      const last = highlightLast && i === items.length - 1;
      const yy = this.y + 6 + i * 6.4;
      const fs = last ? 9.4 : 8.4;
      if (last) {
        d.setFillColor(...this.accent);
        d.rect(x + 1, yy - 4.6, w - 2, 7, "F");
        d.setTextColor(255, 255, 255);
      } else {
        d.setTextColor(...GREY);
      }
      // Le libellé peut être un texte composé dynamique (ex: "Location (30 j × 25 000 FCFA)") :
      // on réserve d'abord la place nécessaire au montant (toujours en gras) avant de
      // tronquer le libellé, pour ne jamais faire chevaucher les deux dans ce bloc étroit.
      d.setFont("helvetica", "bold");
      d.setFontSize(fs);
      const valueW = d.getTextWidth(kv.value);
      const labelMaxW = Math.max(14, w - 8 - valueW - 4);
      d.setFont("helvetica", last ? "bold" : "normal");
      d.text(this.clip(kv.label, labelMaxW), x + 4, yy);
      if (!last) d.setTextColor(...DARK);
      d.setFont("helvetica", "bold");
      d.text(kv.value, x + w - 4, yy, { align: "right" });
    });
    this.y += h + 6;
  }

  paragraph(text: string, opts?: { size?: number; muted?: boolean }) {
    const d = this.doc;
    d.setFont("helvetica", "normal");
    d.setFontSize(opts?.size ?? 8.4);
    d.setTextColor(...(opts?.muted ? GREY : DARK));
    const lines = d.splitTextToSize(text, this.contentW) as string[];
    lines.forEach((l) => {
      this.ensure(6);
      d.text(l, PAGE.ml, this.y);
      this.y += 4.4;
    });
    this.y += 3;
    d.setTextColor(...DARK);
  }

  /** Encadré (conditions générales, mentions). */
  notice(title: string, body: string) {
    if (!body?.trim()) return;
    const d = this.doc;
    d.setFontSize(7.6);
    const lines = d.splitTextToSize(body, this.contentW - 8) as string[];
    const h = 9 + lines.length * 3.6 + 3;
    this.ensure(h + 3);
    d.setFillColor(...SOFT);
    d.setDrawColor(...LINE);
    d.roundedRect(PAGE.ml, this.y, this.contentW, h, 2, 2, "FD");
    d.setFont("helvetica", "bold");
    d.setFontSize(7.6);
    d.setTextColor(...this.accent);
    d.text(title.toUpperCase(), PAGE.ml + 4, this.y + 6);
    d.setFont("helvetica", "normal");
    d.setTextColor(...GREY);
    lines.forEach((l, i) => d.text(l, PAGE.ml + 4, this.y + 11 + i * 3.6));
    this.y += h + 5;
    d.setTextColor(...DARK);
  }

  /** Zones de signature — image intégrée si fournie, sinon ligne à signer. */
  signatures(slots: SignatureSlot[]) {
    const d = this.doc;
    const gap = 8;
    const w = (this.contentW - gap * (slots.length - 1)) / slots.length;
    const h = 34;
    this.ensure(h + 8);
    slots.forEach((s, i) => {
      const x = PAGE.ml + i * (w + gap);
      d.setDrawColor(...LINE);
      d.roundedRect(x, this.y, w, h, 2, 2, "S");
      d.setFont("helvetica", "bold");
      d.setFontSize(7.4);
      d.setTextColor(...GREY);
      d.text(this.clip(s.label.toUpperCase(), w - 7), x + 3.5, this.y + 5.5);
      if (s.dataUrl) {
        try {
          // Le pad de signature (souris/doigt) n'a pas le même ratio largeur/hauteur
          // que cette zone du PDF : étirer l'image dans une boîte fixe la déforme
          // (traits écrasés ou trop épais). On conserve son ratio d'origine et on
          // la centre dans la zone disponible, comme un `object-fit: contain`.
          const boxW = w - 8;
          const boxH = 18;
          let iw = boxW;
          let ih = boxH;
          const props = d.getImageProperties(s.dataUrl);
          if (props?.width && props?.height) {
            const ratio = props.width / props.height;
            if (boxW / boxH > ratio) { ih = boxH; iw = boxH * ratio; }
            else { iw = boxW; ih = boxW / ratio; }
          }
          const ix = x + 4 + (boxW - iw) / 2;
          const iy = this.y + 7 + (boxH - ih) / 2;
          d.addImage(s.dataUrl, ix, iy, iw, ih, undefined, "FAST");
        } catch { /* ignore */ }
      }
      d.setDrawColor(...LINE);
      d.line(x + 4, this.y + 26, x + w - 4, this.y + 26);
      d.setFont("helvetica", "normal");
      d.setFontSize(7.4);
      d.setTextColor(...DARK);
      d.text(this.clip(s.name || "", w - 8), x + 4, this.y + 30.5);
    });
    this.y += h + 6;
  }

  /** Cachet de l'entreprise, discret en bas à droite. */
  stamp() {
    if (!this.profile.stampDataUrl) return;
    try {
      this.doc.addImage(this.profile.stampDataUrl, PAGE.w - PAGE.mr - 34, this.y - 30, 30, 30, undefined, "FAST");
    } catch { /* ignore */ }
  }

  private clip(text: string, maxW: number) {
    const d = this.doc;
    let t = String(text ?? "");
    if (d.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && d.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
    return t + "…";
  }

  /** Pied de page légal + pagination sur toutes les pages. */
  private footersFinalized = false;
  private finalizeFooters() {
    if (this.footersFinalized) return;
    this.footersFinalized = true;
    const d = this.doc;
    const p = this.profile;
    const total = d.getNumberOfPages();
    const legal = [
      p.legalForm && `${p.legalForm}`,
      p.rccm && `RCCM ${p.rccm}`,
      p.ifu && `IFU/NIF ${p.ifu}`,
      p.taxNumber && `N° fiscal ${p.taxNumber}`,
      p.bankName && `${p.bankName}${p.bankAccount ? ` — ${p.bankAccount}` : ""}`,
      p.mobileMoney && `Mobile Money: ${p.mobileMoney}`,
    ].filter(Boolean).join(" · ");

    for (let i = 1; i <= total; i++) {
      d.setPage(i);
      d.setDrawColor(...LINE);
      d.line(PAGE.ml, PAGE.h - 15, PAGE.w - PAGE.mr, PAGE.h - 15);
      d.setFont("helvetica", "normal");
      d.setFontSize(6.6);
      d.setTextColor(...GREY);
      if (legal) d.text(this.clip(legal, this.contentW - 20), PAGE.ml, PAGE.h - 11);
      if (this.footerText) d.text(this.clip(this.footerText, this.contentW - 20), PAGE.ml, PAGE.h - 8);
      d.text(`Page ${i}/${total}`, PAGE.w - PAGE.mr, PAGE.h - 8, { align: "right" });
      d.setFillColor(...this.accent);
      d.rect(0, PAGE.h - 2.5, PAGE.w, 2.5, "F");
    }
  }

  save(filename: string) {
    this.finalizeFooters();
    this.doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  }

  blobUrl(): string {
    this.finalizeFooters();
    return this.doc.output("dataurlstring");
  }

  /** Fichier réel (Blob nommé), pour persistance côté serveur — ex. `uploadPrivateDocument()`. */
  toFile(filename: string): File {
    this.finalizeFooters();
    const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    const blob = this.doc.output("blob") as Blob;
    return new File([blob], name, { type: "application/pdf" });
  }

  open() {
    this.finalizeFooters();
    const url = this.doc.output("bloburl");
    window.open(url as unknown as string, "_blank");
  }

  /** URL `blob:` du PDF, pour l'afficher dans un `<iframe>` d'aperçu en page
   * (contrairement à `.open()`/`window.open`, ne dépend pas de l'autorisation
   * popup du navigateur — important quand l'appel suit un `await` réseau, où
   * beaucoup de navigateurs bloquent silencieusement une nouvelle fenêtre). */
  objectUrl(): string {
    this.finalizeFooters();
    return this.doc.output("bloburl") as unknown as string;
  }
}

export function slug(s: string) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
