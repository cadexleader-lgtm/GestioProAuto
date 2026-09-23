/**
 * Adaptateurs de compatibilité — délèguent aux modèles PDF professionnels,
 * déclenchent le téléchargement local ET persistent le vrai fichier dans le
 * coffre-fort privé (Supabase Storage), pour qu'il reste téléchargeable
 * depuis n'importe quel appareil après la génération initiale.
 * @see src/lib/pdf/templates.ts
 * @see src/lib/demo-store.ts:uploadPrivateDocument
 */
import { formatFCFA } from "./format";
import type { Vehicle, VehicleCredit, Rental } from "./demo-data";
import type { VehicleSale, VehiclePayment } from "./demo-store";
import { uploadPrivateDocument } from "./demo-store";
import {
  pdfRentalContract, pdfSaleContract, pdfCreditContract, pdfReceipt, sendWhatsApp as waSend,
} from "./pdf/templates";

const label = (v: Vehicle) => `${v.brand} ${v.model} (${v.plate})`;

export async function generateRentalContract(rental: Rental, vehicle: Vehicle) {
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
}

export async function generateSaleInvoice(sale: VehicleSale, vehicle: Vehicle) {
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
}

export async function generateCreditSchedule(credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[]) {
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
}

export async function generatePaymentReceipt(payment: VehiclePayment, credit: VehicleCredit, vehicle: Vehicle) {
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
}

export { formatFCFA };
export const sendWhatsApp = waSend;
