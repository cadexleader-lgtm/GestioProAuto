/**
 * Adaptateurs de compatibilité — délèguent aux modèles PDF professionnels,
 * persistent le vrai fichier dans le coffre-fort privé (Supabase Storage)
 * et retournent le `PdfDoc` construit. Ne déclenchent plus aucun
 * téléchargement/ouverture eux-mêmes (c'était le cas avant : chaque modèle
 * de pdf/templates.ts appelait `.save()` en interne, provoquant un
 * téléchargement surprise à chaque génération, y compris silencieuse) —
 * c'est à l'appelant de décider quoi faire du `PdfDoc` retourné, typiquement
 * via `PdfPreviewDialog`/`usePdfPreview()` pour un aperçu avant
 * téléchargement/impression.
 * @see src/lib/pdf/templates.ts
 * @see src/lib/demo-store.ts:uploadPrivateDocument
 * @see src/components/PdfPreviewDialog.tsx
 */
import { formatFCFA } from "./format";
import type { Vehicle, VehicleCredit, Rental } from "./demo-data";
import type { VehicleSale, VehiclePayment } from "./demo-store";
import { uploadPrivateDocument, addDocumentRelation } from "./demo-store";
import { sendWhatsApp as waSend } from "./whatsapp";
// jsPDF (~475 Ko) n'est chargé qu'à l'appel réel d'une des fonctions
// ci-dessous (import() dynamique), pas au chargement des pages Ventes/
// Crédits/Locations qui importent ce module — voir CLAUDE.md perf.

const label = (v: Vehicle) => `${v.brand} ${v.model} (${v.plate})`;

export async function generateRentalContract(rental: Rental, vehicle: Vehicle) {
  const { pdfRentalContract } = await import("./pdf/templates");
  const doc = pdfRentalContract(rental, vehicle);
  const filename = `contrat-location-${rental.id}.pdf`;
  await uploadPrivateDocument({
    documentId: `rental-contract:${rental.id}`,
    file: doc.toFile(filename),
    type: "contrat-location",
    reference: `LOC-${rental.id}`,
    title: `Contrat de location — ${label(vehicle)}`,
    relatedTo: rental.customer,
    amount: rental.totalAmount ?? 0,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    relationType: "rental_contract",
    expiresAt: rental.endDate,
    origin: "Généré",
    metadata: { phone: (rental as any).phone, rentalId: rental.id },
  });
  await linkDocumentToCustomer(`rental-contract:${rental.id}`, rental.customer);
  return doc;
}

/** Relie aussi le document au client (en plus du véhicule, déjà fait par
 * uploadPrivateDocument) — pour qu'il apparaisse dans l'onglet Documents de
 * la fiche client (VehiculesClients.tsx), pas juste sur la fiche véhicule.
 * Best-effort : un échec ici ne doit jamais faire échouer la génération du
 * contrat lui-même (déjà archivé avec succès à ce stade). */
async function linkDocumentToCustomer(documentId: string, customer: string | undefined) {
  if (!customer?.trim()) return;
  try {
    await addDocumentRelation(documentId, "customer", customer.trim());
  } catch (error) {
    console.error("[gestiopro] document-customer link failed", error);
  }
}

export async function generateSaleInvoice(sale: VehicleSale, vehicle: Vehicle) {
  const { pdfSaleContract } = await import("./pdf/templates");
  const doc = pdfSaleContract(sale, vehicle);
  const filename = `contrat-vente-${sale.id}.pdf`;
  await uploadPrivateDocument({
    documentId: `sale-contract:${sale.id}`,
    file: doc.toFile(filename),
    type: "contrat-vente",
    reference: `VTE-${sale.id}`,
    title: `Contrat de vente — ${label(vehicle)}`,
    relatedTo: sale.customer,
    amount: sale.amount,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    relationType: "sale_contract",
    origin: "Généré",
    metadata: { phone: sale.phone, saleId: sale.id },
  });
  await linkDocumentToCustomer(`sale-contract:${sale.id}`, sale.customer);
  return doc;
}

export async function generateCreditSchedule(credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[]) {
  const { pdfCreditContract } = await import("./pdf/templates");
  const doc = pdfCreditContract(credit, vehicle, payments);
  const filename = `contrat-credit-${credit.id}.pdf`;
  await uploadPrivateDocument({
    documentId: `credit-contract:${credit.id}`,
    file: doc.toFile(filename),
    type: "contrat-credit",
    reference: `CRE-${credit.id}`,
    title: `Échéancier de crédit — ${label(vehicle)}`,
    relatedTo: credit.customer,
    amount: credit.total,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    relationType: "credit_contract",
    expiresAt: credit.nextDueDate,
    origin: "Généré",
    metadata: { phone: (credit as any).phone, creditId: credit.id },
  });
  await linkDocumentToCustomer(`credit-contract:${credit.id}`, credit.customer);
  return doc;
}

export async function generatePaymentReceipt(payment: VehiclePayment, credit: VehicleCredit, vehicle: Vehicle) {
  const { pdfReceipt } = await import("./pdf/templates");
  const paidBefore = 0;
  const doc = pdfReceipt({
    reference: payment.id,
    date: payment.date,
    payerName: credit.customer,
    amount: payment.amount,
    reason: `Échéance crédit véhicule ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    method: payment.method,
    vehicle,
    balance: Math.max(0, credit.total - credit.downPayment - payment.amount - paidBefore),
  });
  const filename = `recu-${payment.id}.pdf`;
  await uploadPrivateDocument({
    documentId: `payment-receipt:${payment.id}`,
    file: doc.toFile(filename),
    type: "recu",
    reference: `REC-${payment.id}`,
    title: `Reçu de paiement — ${credit.customer}`,
    relatedTo: credit.customer,
    amount: payment.amount,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    relationType: "credit_payment_receipt",
    origin: "Généré",
    metadata: { phone: (credit as any).phone, creditId: credit.id, paymentId: payment.id },
  });
  await linkDocumentToCustomer(`payment-receipt:${payment.id}`, credit.customer);
  return doc;
}

export { formatFCFA };
export const sendWhatsApp = waSend;
