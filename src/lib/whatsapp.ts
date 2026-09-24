/**
 * Aide WhatsApp autonome — extraite de pdf/templates.ts (perf).
 * N'importe ni ./pdf/engine ni jsPDF : les pages qui n'ont besoin que
 * d'ouvrir un message WhatsApp pré-rempli ne doivent pas charger le moteur
 * PDF (~475 Ko) juste pour ça. pdf/templates.ts et vehicle-pdf.ts
 * réexportent depuis ce fichier pour compatibilité.
 */
export function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/[^\d]/g, "");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
}
