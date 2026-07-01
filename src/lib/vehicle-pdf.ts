/**
 * Simple PDF generation helpers for the vehicle module.
 * Uses jsPDF (client-only). Import lazily where used.
 */
import jsPDF from "jspdf";
import { formatFCFA } from "./format";
import type { Vehicle, VehicleCredit, Rental } from "./demo-data";
import type { VehicleSale, VehiclePayment } from "./demo-store";

const BRAND = "GestioPro";
const PRIMARY: [number, number, number] = [37, 99, 235];

function header(doc: jsPDF, title: string) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BRAND, 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 22);
  doc.setTextColor(30, 30, 30);
}

function footer(doc: jsPDF) {
  doc.setDrawColor(230);
  doc.line(14, 280, 196, 280);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Généré par ${BRAND} — ${new Date().toLocaleString("fr-FR")}`, 14, 286);
}

function row(doc: jsPDF, y: number, label: string, value: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, 80, y);
  return y + 7;
}

function section(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(240, 244, 255);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(title, 16, y);
  doc.setTextColor(30);
  return y + 10;
}

/* ---------- Contrat de location ---------- */
export function generateRentalContract(rental: Rental, vehicle: Vehicle) {
  const doc = new jsPDF();
  header(doc, "Contrat de location de véhicule");
  const days = Math.max(1, Math.round((+new Date(rental.endDate) - +new Date(rental.startDate)) / 86400000));
  const total = rental.totalAmount ?? days * rental.dailyRate;
  let y = 40;
  y = section(doc, y, "Locataire");
  y = row(doc, y, "Nom complet", rental.customer);
  y = row(doc, y, "Téléphone", rental.phone || "—");
  y = row(doc, y, "Adresse", rental.address || "—");
  y = row(doc, y, "N° Permis", rental.licenseNumber || "—");
  y = row(doc, y, "Pièce d'identité", rental.idDocument || "—");

  y += 4;
  y = section(doc, y, "Véhicule");
  y = row(doc, y, "Marque / Modèle", `${vehicle.brand} ${vehicle.model} (${vehicle.year})`);
  y = row(doc, y, "Immatriculation", vehicle.plate);
  y = row(doc, y, "Couleur", vehicle.color);
  y = row(doc, y, "Kilométrage départ", `${vehicle.mileageKm.toLocaleString("fr-FR")} km`);

  y += 4;
  y = section(doc, y, "Période & tarifs");
  y = row(doc, y, "Du", `${rental.startDate} ${rental.startTime || ""}`);
  y = row(doc, y, "Au", `${rental.endDate} ${rental.endTime || ""}`);
  y = row(doc, y, "Durée", `${days} jour(s)`);
  y = row(doc, y, "Tarif journalier", formatFCFA(rental.dailyRate));
  y = row(doc, y, "Total", formatFCFA(total));
  y = row(doc, y, "Caution", formatFCFA(rental.deposit));
  y = row(doc, y, "Avance versée", formatFCFA(rental.advance || 0));
  y = row(doc, y, "Reste à payer", formatFCFA(rental.remaining ?? total - (rental.advance || 0)));

  y += 14;
  doc.setFontSize(9);
  doc.text("Signature du locataire :", 14, y);
  doc.text("Signature du loueur :", 120, y);
  doc.line(14, y + 22, 90, y + 22);
  doc.line(120, y + 22, 196, y + 22);

  footer(doc);
  doc.save(`contrat-location-${rental.customer}-${rental.startDate}.pdf`);
}

/* ---------- Facture / Bon de vente ---------- */
export function generateSaleInvoice(sale: VehicleSale, vehicle: Vehicle) {
  const doc = new jsPDF();
  header(doc, sale.payment === "credit" ? "Contrat de vente à crédit" : "Facture de vente");
  let y = 40;
  y = section(doc, y, "Client");
  y = row(doc, y, "Nom", sale.customer);
  y = row(doc, y, "Téléphone", sale.phone || "—");
  y = row(doc, y, "Date", sale.date);

  y += 4;
  y = section(doc, y, "Véhicule vendu");
  y = row(doc, y, "Marque / Modèle", `${vehicle.brand} ${vehicle.model} (${vehicle.year})`);
  y = row(doc, y, "VIN", vehicle.vin);
  y = row(doc, y, "Immatriculation", vehicle.plate);
  y = row(doc, y, "Couleur", vehicle.color);
  y = row(doc, y, "Kilométrage", `${vehicle.mileageKm.toLocaleString("fr-FR")} km`);

  y += 4;
  y = section(doc, y, "Montant");
  y = row(doc, y, "Mode de paiement", sale.payment === "credit" ? "À crédit" : "Comptant");
  y = row(doc, y, "Montant total", formatFCFA(sale.amount));

  y += 20;
  doc.setFontSize(9);
  doc.text("Signature du vendeur :", 14, y);
  doc.text("Signature de l'acheteur :", 120, y);
  doc.line(14, y + 22, 90, y + 22);
  doc.line(120, y + 22, 196, y + 22);

  footer(doc);
  doc.save(`facture-vente-${sale.customer}-${sale.date}.pdf`);
}

/* ---------- Échéancier crédit ---------- */
export function generateCreditSchedule(
  credit: VehicleCredit, vehicle: Vehicle, payments: VehiclePayment[],
) {
  const doc = new jsPDF();
  header(doc, "Échéancier de crédit véhicule");
  let y = 40;
  y = section(doc, y, "Client & véhicule");
  y = row(doc, y, "Client", credit.customer);
  y = row(doc, y, "Véhicule", `${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`);
  y = row(doc, y, "Montant total", formatFCFA(credit.total));
  y = row(doc, y, "Apport initial", formatFCFA(credit.downPayment));
  y = row(doc, y, "Mensualité", formatFCFA(credit.monthlyPayment));
  y = row(doc, y, "Durée", `${credit.totalMonths} mois`);
  y = row(doc, y, "Prochaine échéance", credit.nextDueDate);

  y += 4;
  y = section(doc, y, `Historique des paiements (${payments.length})`);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Date", 16, y);
  doc.text("Méthode", 60, y);
  doc.text("Montant", 130, y, { align: "right" });
  y += 5;
  doc.setDrawColor(220);
  doc.line(14, y, 196, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  let total = credit.downPayment;
  if (credit.downPayment > 0) {
    doc.text("(apport)", 16, y);
    doc.text("—", 60, y);
    doc.text(formatFCFA(credit.downPayment), 130, y, { align: "right" });
    y += 6;
  }
  payments.forEach((p) => {
    doc.text(p.date, 16, y);
    doc.text(p.method, 60, y);
    doc.text(formatFCFA(p.amount), 130, y, { align: "right" });
    total += p.amount;
    y += 6;
    if (y > 260) { doc.addPage(); y = 20; }
  });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Total payé", 16, y);
  doc.text(formatFCFA(total), 130, y, { align: "right" });
  y += 6;
  doc.text("Reste dû", 16, y);
  doc.text(formatFCFA(Math.max(0, credit.total - total)), 130, y, { align: "right" });

  footer(doc);
  doc.save(`credit-${credit.customer}-${credit.id}.pdf`);
}

/* ---------- Reçu de paiement ---------- */
export function generatePaymentReceipt(payment: VehiclePayment, credit: VehicleCredit, vehicle: Vehicle) {
  const doc = new jsPDF();
  header(doc, "Reçu de paiement");
  let y = 40;
  y = row(doc, y, "N° reçu", payment.id);
  y = row(doc, y, "Date", payment.date);
  y = row(doc, y, "Reçu de", credit.customer);
  y = row(doc, y, "Véhicule", `${vehicle.brand} ${vehicle.model}`);
  y = row(doc, y, "Méthode", payment.method);
  y = row(doc, y, "Montant reçu", formatFCFA(payment.amount));
  if (payment.note) y = row(doc, y, "Note", payment.note);
  footer(doc);
  doc.save(`recu-${payment.id}.pdf`);
}

/* ---------- WhatsApp helper ---------- */
export function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/[^\d]/g, "");
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
