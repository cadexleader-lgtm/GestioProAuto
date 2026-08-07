/**
 * Modèles PDF professionnels GestioPro.
 * Toutes les infos entreprise / client / véhicule sont injectées automatiquement.
 */
import { PdfDoc, slug, type SignatureSlot } from "./engine";
import { formatFCFA } from "@/lib/format";
import { getCompanyProfile } from "@/lib/company-profile";
import type { Vehicle, VehicleCredit, Rental } from "@/lib/demo-data";
import type { VehicleSale, VehiclePayment } from "@/lib/demo-store";

const fdate = (d?: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return d; }
};
const today = () => new Date().toISOString().slice(0, 10);

function vendorParty() {
  const p = getCompanyProfile();
  return {
    heading: "Le vendeur / prestataire",
    lines: [
      p.name || "Votre entreprise",
      [p.address, p.city].filter(Boolean).join(", "),
      p.country,
      p.phone,
      p.email,
      p.rccm ? `RCCM ${p.rccm}` : "",
    ],
  };
}

function vehicleLines(v: Vehicle) {
  return [
    { label: "Marque / Modèle", value: `${v.brand} ${v.model}` },
    { label: "Année", value: String(v.year) },
    { label: "Immatriculation", value: v.plate },
    { label: "N° de châssis (VIN)", value: v.vin },
    { label: "Couleur", value: v.color },
    { label: "Carburant", value: v.fuel },
    { label: "Transmission", value: v.transmission },
    { label: "Kilométrage", value: `${v.mileageKm.toLocaleString("fr-FR")} km` },
  ];
}

function sigSlots(
  clientName: string,
  signatures?: { client?: string; vendor?: string },
): SignatureSlot[] {
  const p = getCompanyProfile();
  return [
    { label: "Le client", name: clientName, dataUrl: signatures?.client },
    {
      label: "Pour l'entreprise",
      name: p.name || "",
      dataUrl: signatures?.vendor || p.signatureDataUrl || undefined,
    },
  ];
}

/* ============================ CONTRAT DE VENTE ============================ */
export function pdfSaleContract(sale: VehicleSale, vehicle: Vehicle) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({
    title: sale.payment === "credit" ? "Contrat de vente à crédit" : "Contrat de vente",
    reference: `CV-${sale.id.slice(-6).toUpperCase()}`,
    date: fdate(sale.date),
    subtitle: sale.payment === "credit" ? "Paiement échelonné" : "Paiement comptant",
    tag: "Exemplaire original",
  });

  d.parties([
    vendorParty(),
    {
      heading: "L'acheteur",
      lines: [sale.customer, sale.phone || "", sale.address || "", sale.cin ? `Pièce d'identité : ${sale.cin}` : ""],
    },
  ]);

  d.sectionTitle("Désignation du véhicule");
  d.keyValues(vehicleLines(vehicle));

  d.sectionTitle("Conditions financières");
  d.table(
    [
      { header: "Désignation", width: 100 },
      { header: "Détail", width: 45 },
      { header: "Montant", width: 45, align: "right" },
    ],
    [
      [`${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`, `${vehicle.year} · ${vehicle.mileageKm.toLocaleString("fr-FR")} km`, formatFCFA(sale.amount)],
    ],
  );
  const down = sale.downPayment ?? (sale.payment === "cash" ? sale.amount : 0);
  d.totals([
    { label: "Prix de vente", value: formatFCFA(sale.amount) },
    { label: sale.payment === "credit" ? "Apport initial versé" : "Montant réglé", value: formatFCFA(down) },
    { label: "Reste à payer", value: formatFCFA(Math.max(0, sale.amount - down)) },
  ]);

  d.sectionTitle("Modalités");
  d.paragraph(
    `Le vendeur déclare être le propriétaire légitime du véhicule désigné ci-dessus et garantit qu'il est libre de tout gage. ` +
    `L'acheteur reconnaît avoir examiné le véhicule et l'accepter dans son état actuel. ` +
    (sale.payment === "credit"
      ? `Le solde est réglé selon l'échéancier de crédit annexé au présent contrat. Le transfert définitif de propriété intervient au paiement intégral.`
      : `Le règlement intégral a été effectué${sale.method ? ` par ${sale.method}` : ""}, la propriété est transférée à la signature du présent contrat.`),
  );
  if (sale.delivery) {
    d.keyValues([
      { label: "Date de livraison", value: fdate(sale.delivery.date) },
      { label: "Kilométrage à la remise", value: `${(sale.delivery.km || 0).toLocaleString("fr-FR")} km` },
      { label: "Niveau de carburant", value: sale.delivery.fuelLevel || "—" },
      { label: "Observations", value: sale.delivery.conditionNote || "—" },
    ]);
  }

  d.notice("Conditions générales", p.terms || "Le véhicule est vendu en l'état. Aucune réclamation ne sera acceptée après la remise des clés, sauf vice caché avéré au sens de la loi applicable.");
  d.signatures(sigSlots(sale.customer, sale.signatures));
  d.stamp();
  d.save(`contrat-vente-${slug(sale.customer)}-${sale.date}`);
}

/* ========================= CONTRAT DE LOCATION ============================ */
export function pdfRentalContract(rental: Rental, vehicle: Vehicle) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  const days = Math.max(1, Math.round((+new Date(rental.endDate) - +new Date(rental.startDate)) / 86400000));
  const total = rental.totalAmount ?? days * rental.dailyRate;
  const advance = rental.advance || 0;

  d.header({
    title: "Contrat de location de véhicule",
    reference: `CL-${rental.id.slice(-6).toUpperCase()}`,
    date: fdate(rental.startDate),
    subtitle: `${days} jour(s) de location`,
  });

  d.parties([
    vendorParty(),
    {
      heading: "Le locataire",
      lines: [
        rental.customer, rental.phone || "", rental.address || "",
        rental.licenseNumber ? `Permis n° ${rental.licenseNumber}` : "",
        rental.idDocument ? `Pièce : ${rental.idDocument}` : "",
      ],
    },
  ]);

  d.sectionTitle("Véhicule loué");
  d.keyValues(vehicleLines(vehicle));

  d.sectionTitle("Période de location");
  d.keyValues([
    { label: "Départ", value: `${fdate(rental.startDate)} ${rental.startTime || ""}` },
    { label: "Retour prévu", value: `${fdate(rental.endDate)} ${rental.endTime || ""}` },
    { label: "Durée", value: `${days} jour(s)` },
    { label: "Tarif journalier", value: formatFCFA(rental.dailyRate) },
  ]);

  d.sectionTitle("Règlement");
  d.totals([
    { label: `Location (${days} j × ${formatFCFA(rental.dailyRate)})`, value: formatFCFA(total) },
    { label: "Caution", value: formatFCFA(rental.deposit) },
    { label: "Avance versée", value: formatFCFA(advance) },
    { label: "Reste à payer", value: formatFCFA(rental.remaining ?? Math.max(0, total - advance)) },
  ]);

  if (rental.notes) { d.sectionTitle("Observations"); d.paragraph(rental.notes); }

  d.notice(
    "Conditions générales de location",
    p.terms ||
      "Le locataire s'engage à restituer le véhicule à la date convenue, dans l'état où il l'a reçu, carburant au même niveau. " +
      "Tout retard entraîne la facturation d'une journée supplémentaire. Les amendes et contraventions durant la période de location restent à la charge du locataire. " +
      "La caution est restituée après vérification de l'état du véhicule.",
  );
  d.signatures(sigSlots(rental.customer, rental.signatures));
  d.stamp();
  d.save(`contrat-location-${slug(rental.customer)}-${rental.startDate}`);
}

/* ====================== CONTRAT / ÉCHÉANCIER CRÉDIT ======================= */
export function pdfCreditContract(credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[]) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({
    title: "Contrat de vente à crédit",
    reference: `CC-${credit.id.slice(-6).toUpperCase()}`,
    date: fdate(today()),
    subtitle: `${credit.totalMonths} mensualités`,
  });

  d.parties([vendorParty(), { heading: "L'acheteur", lines: [credit.customer] }]);

  d.sectionTitle("Véhicule financé");
  d.keyValues(vehicleLines(vehicle));

  d.sectionTitle("Plan de financement");
  d.keyValues([
    { label: "Prix total", value: formatFCFA(credit.total) },
    { label: "Apport initial", value: formatFCFA(credit.downPayment) },
    { label: "Montant financé", value: formatFCFA(credit.total - credit.downPayment) },
    { label: "Mensualité", value: formatFCFA(credit.monthlyPayment) },
    { label: "Durée", value: `${credit.totalMonths} mois` },
    { label: "Prochaine échéance", value: fdate(credit.nextDueDate) },
  ]);

  d.sectionTitle("Échéancier prévisionnel");
  const rows: string[][] = [];
  const start = new Date(credit.nextDueDate);
  for (let i = 0; i < credit.totalMonths; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i - credit.paidMonths);
    rows.push([
      String(i + 1),
      fdate(due.toISOString().slice(0, 10)),
      formatFCFA(credit.monthlyPayment),
      i < credit.paidMonths ? "Payée" : "À échoir",
    ]);
  }
  d.table(
    [
      { header: "N°", width: 15, align: "center" },
      { header: "Échéance", width: 60 },
      { header: "Montant", width: 55, align: "right" },
      { header: "Statut", width: 40, align: "right" },
    ],
    rows,
  );

  const paid = credit.downPayment + payments.reduce((s, x) => s + x.amount, 0);
  d.totals([
    { label: "Total dû", value: formatFCFA(credit.total) },
    { label: "Total réglé", value: formatFCFA(paid) },
    { label: "Solde restant", value: formatFCFA(Math.max(0, credit.total - paid)) },
  ]);

  d.notice(
    "Clause de réserve de propriété",
    p.terms || "Le véhicule demeure la propriété du vendeur jusqu'au paiement intégral du prix. Tout retard de paiement supérieur à 30 jours peut entraîner la reprise du véhicule.",
  );
  d.signatures(sigSlots(credit.customer, credit.signatures));
  d.stamp();
  d.save(`contrat-credit-${slug(credit.customer)}-${credit.id}`);
}

/* ================================ FACTURE ================================= */
export interface InvoiceLine { designation: string; detail?: string; qty?: number; unitPrice: number }

export function pdfInvoice(opts: {
  reference: string;
  date?: string;
  customer: { name: string; phone?: string; address?: string; extra?: string };
  lines: InvoiceLine[];
  paid?: number;
  note?: string;
  title?: string;
  vehicle?: Vehicle;
  signatures?: { client?: string; vendor?: string };
}) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({
    title: opts.title || "Facture",
    reference: opts.reference,
    date: fdate(opts.date || today()),
  });

  d.parties([
    vendorParty(),
    { heading: "Facturé à", lines: [opts.customer.name, opts.customer.phone || "", opts.customer.address || "", opts.customer.extra || ""] },
  ]);

  if (opts.vehicle) {
    d.sectionTitle("Véhicule concerné");
    d.keyValues(vehicleLines(opts.vehicle));
  }

  d.sectionTitle("Détail");
  const total = opts.lines.reduce((s, l) => s + (l.qty ?? 1) * l.unitPrice, 0);
  d.table(
    [
      { header: "Désignation", width: 85 },
      { header: "Détail", width: 40 },
      { header: "Qté", width: 15, align: "center" },
      { header: "P.U.", width: 25, align: "right" },
      { header: "Total", width: 30, align: "right" },
    ],
    opts.lines.map((l) => [
      l.designation, l.detail || "—", String(l.qty ?? 1),
      formatFCFA(l.unitPrice), formatFCFA((l.qty ?? 1) * l.unitPrice),
    ]),
  );

  const paid = opts.paid ?? 0;
  d.totals([
    { label: "Sous-total", value: formatFCFA(total) },
    { label: "Réglé", value: formatFCFA(paid) },
    { label: "Net à payer", value: formatFCFA(Math.max(0, total - paid)) },
  ]);

  if (opts.note) d.paragraph(opts.note, { muted: true });
  if (p.bankName || p.mobileMoney) {
    d.notice(
      "Coordonnées de règlement",
      [
        p.bankName && `Banque : ${p.bankName}`,
        p.bankAccount && `Compte : ${p.bankAccount}`,
        p.bankIban && `IBAN : ${p.bankIban}`,
        p.bankSwift && `SWIFT : ${p.bankSwift}`,
        p.mobileMoney && `Mobile Money : ${p.mobileMoney}`,
      ].filter(Boolean).join("   ·   "),
    );
  }
  d.notice("Conditions générales", p.terms || "");
  d.signatures(sigSlots(opts.customer.name, opts.signatures));
  d.stamp();
  d.save(`facture-${slug(opts.reference)}`);
}

/* ================================= REÇU =================================== */
export function pdfReceipt(opts: {
  reference: string;
  date?: string;
  payerName: string;
  amount: number;
  reason: string;
  method?: string;
  balance?: number;
  vehicle?: Vehicle;
  signatures?: { client?: string; vendor?: string };
}) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({ title: "Reçu de paiement", reference: opts.reference, date: fdate(opts.date || today()) });

  d.parties([vendorParty(), { heading: "Reçu de", lines: [opts.payerName] }]);

  d.sectionTitle("Objet du règlement");
  d.keyValues([
    { label: "Motif", value: opts.reason },
    { label: "Mode de paiement", value: opts.method || "—" },
    ...(opts.vehicle ? [{ label: "Véhicule", value: `${opts.vehicle.brand} ${opts.vehicle.model} — ${opts.vehicle.plate}` }] : []),
    { label: "Date", value: fdate(opts.date || today()) },
  ]);

  d.totals([
    { label: "Montant reçu", value: formatFCFA(opts.amount) },
    ...(typeof opts.balance === "number" ? [{ label: "Solde restant dû", value: formatFCFA(opts.balance) }] : []),
  ]);

  d.paragraph(
    `Nous accusons réception de la somme de ${formatFCFA(opts.amount)} versée par ${opts.payerName} au titre de : ${opts.reason}.`,
  );
  d.signatures(sigSlots(opts.payerName, opts.signatures));
  d.stamp();
  d.save(`recu-${slug(opts.reference)}`);
}

/* =========================== BON DE COMMANDE ============================== */
export function pdfPurchaseOrder(opts: {
  reference: string;
  date?: string;
  supplier: { name: string; phone?: string; address?: string };
  lines: InvoiceLine[];
  deliveryDate?: string;
  note?: string;
}) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({ title: "Bon de commande", reference: opts.reference, date: fdate(opts.date || today()) });
  d.parties([
    { heading: "Donneur d'ordre", lines: vendorParty().lines },
    { heading: "Fournisseur", lines: [opts.supplier.name, opts.supplier.phone || "", opts.supplier.address || ""] },
  ]);
  d.sectionTitle("Articles commandés");
  const total = opts.lines.reduce((s, l) => s + (l.qty ?? 1) * l.unitPrice, 0);
  d.table(
    [
      { header: "Désignation", width: 95 },
      { header: "Qté", width: 20, align: "center" },
      { header: "P.U.", width: 35, align: "right" },
      { header: "Total", width: 35, align: "right" },
    ],
    opts.lines.map((l) => [l.designation, String(l.qty ?? 1), formatFCFA(l.unitPrice), formatFCFA((l.qty ?? 1) * l.unitPrice)]),
  );
  d.totals([{ label: "Total commande", value: formatFCFA(total) }]);
  d.keyValues([{ label: "Livraison souhaitée", value: fdate(opts.deliveryDate) }]);
  if (opts.note) d.paragraph(opts.note, { muted: true });
  d.notice("Conditions", p.terms || "");
  d.signatures([{ label: "Pour l'entreprise", name: p.name, dataUrl: p.signatureDataUrl || undefined }, { label: "Le fournisseur", name: opts.supplier.name }]);
  d.stamp();
  d.save(`bon-commande-${slug(opts.reference)}`);
}

/* ============================== ATTESTATION =============================== */
export function pdfAttestation(opts: {
  reference: string;
  date?: string;
  recipient: string;
  subject: string;
  body: string;
  vehicle?: Vehicle;
}) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({ title: "Attestation", reference: opts.reference, date: fdate(opts.date || today()), subtitle: opts.subject });
  d.parties([vendorParty(), { heading: "Destinataire", lines: [opts.recipient] }]);
  d.sectionTitle(opts.subject);
  d.paragraph(opts.body);
  if (opts.vehicle) { d.sectionTitle("Véhicule concerné"); d.keyValues(vehicleLines(opts.vehicle)); }
  d.paragraph("En foi de quoi la présente attestation est délivrée pour servir et valoir ce que de droit.");
  d.signatures([{ label: "Pour l'entreprise", name: p.name, dataUrl: p.signatureDataUrl || undefined }]);
  d.stamp();
  d.save(`attestation-${slug(opts.reference)}`);
}

/* ================================ RAPPORT ================================= */
export interface ReportSection {
  title: string;
  kpis?: { label: string; value: string }[];
  columns?: { header: string; width: number; align?: "left" | "right" | "center" }[];
  rows?: string[][];
  totals?: { label: string; value: string }[];
  text?: string;
}

export function pdfReport(opts: { title: string; period: string; sections: ReportSection[]; reference?: string }) {
  const p = getCompanyProfile();
  const d = new PdfDoc(p);
  d.header({
    title: opts.title,
    reference: opts.reference || `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    date: fdate(today()),
    subtitle: opts.period,
  });

  opts.sections.forEach((s) => {
    d.sectionTitle(s.title);
    if (s.kpis?.length) d.keyValues(s.kpis, 2);
    if (s.text) d.paragraph(s.text);
    if (s.columns?.length && s.rows?.length) d.table(s.columns, s.rows);
    else if (s.columns?.length) d.paragraph("Aucune donnée sur la période.", { muted: true });
    if (s.totals?.length) d.totals(s.totals);
  });

  d.signatures([{ label: "Établi par", name: p.name, dataUrl: p.signatureDataUrl || undefined }]);
  d.stamp();
  d.save(`rapport-${slug(opts.title)}-${today()}`);
}

/* ---------- WhatsApp helper (conservé) ---------- */
export function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/[^\d]/g, "");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
}
