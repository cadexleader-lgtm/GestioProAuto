/**
 * Adaptateurs de compatibilité — délèguent aux modèles PDF professionnels
 * et archivent automatiquement chaque document dans le coffre-fort.
 * @see src/lib/pdf/templates.ts
 */
import { formatFCFA } from "./format";
import type { Vehicle, VehicleCredit, Rental } from "./demo-data";
import type { VehicleSale, VehiclePayment } from "./demo-store";
import { archiveDocument } from "./demo-store";
import {
  pdfRentalContract, pdfSaleContract, pdfCreditContract, pdfReceipt, sendWhatsApp as waSend,
} from "./pdf/templates";

const label = (v: Vehicle) => `${v.brand} ${v.model} (${v.plate})`;

export function generateRentalContract(rental: Rental, vehicle: Vehicle) {
  pdfRentalContract(rental, vehicle);
  archiveDocument({
    type: "contrat-location",
    reference: `LOC-${rental.id}`,
    title: `Contrat de location — ${label(vehicle)}`,
    relatedTo: rental.customer,
    amount: rental.totalAmount ?? 0,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    expiresAt: rental.endDate,
    payload: { phone: (rental as any).phone },
  });
}

export function generateSaleInvoice(sale: VehicleSale, vehicle: Vehicle) {
  pdfSaleContract(sale, vehicle);
  archiveDocument({
    type: "contrat-vente",
    reference: `VTE-${sale.id}`,
    title: `Contrat de vente — ${label(vehicle)}`,
    relatedTo: sale.customer,
    amount: sale.amount,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    payload: { phone: sale.phone },
  });
}

export function generateCreditSchedule(credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[]) {
  pdfCreditContract(credit, vehicle, payments);
  archiveDocument({
    type: "contrat-credit",
    reference: `CRE-${credit.id}`,
    title: `Échéancier de crédit — ${label(vehicle)}`,
    relatedTo: credit.customer,
    amount: credit.total,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    expiresAt: credit.nextDueDate,
    payload: { phone: (credit as any).phone },
  });
}

export function generatePaymentReceipt(payment: VehiclePayment, credit: VehicleCredit, vehicle: Vehicle) {
  const paidBefore = 0;
  pdfReceipt({
    reference: payment.id,
    date: payment.date,
    payerName: credit.customer,
    amount: payment.amount,
    reason: `Échéance crédit véhicule ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    method: payment.method,
    vehicle,
    balance: Math.max(0, credit.total - credit.downPayment - payment.amount - paidBefore),
  });
  archiveDocument({
    type: "recu",
    reference: `REC-${payment.id}`,
    title: `Reçu de paiement — ${credit.customer}`,
    relatedTo: credit.customer,
    amount: payment.amount,
    entityType: "vehicle",
    entityId: vehicle.id,
    entityLabel: label(vehicle),
    payload: { phone: (credit as any).phone },
  });
}

export { formatFCFA };
export const sendWhatsApp = waSend;
