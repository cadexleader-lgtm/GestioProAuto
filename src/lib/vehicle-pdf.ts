/**
 * Adaptateurs de compatibilité — délèguent aux modèles PDF professionnels.
 * @see src/lib/pdf/templates.ts
 */
import { formatFCFA } from "./format";
import type { Vehicle, VehicleCredit, Rental } from "./demo-data";
import type { VehicleSale, VehiclePayment } from "./demo-store";
import {
  pdfRentalContract, pdfSaleContract, pdfCreditContract, pdfReceipt, sendWhatsApp as waSend,
} from "./pdf/templates";

export function generateRentalContract(rental: Rental, vehicle: Vehicle) {
  pdfRentalContract(rental, vehicle);
}

export function generateSaleInvoice(sale: VehicleSale, vehicle: Vehicle) {
  pdfSaleContract(sale, vehicle);
}

export function generateCreditSchedule(credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[]) {
  pdfCreditContract(credit, vehicle, payments);
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
}

export { formatFCFA };
export const sendWhatsApp = waSend;
