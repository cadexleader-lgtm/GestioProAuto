// Liste des comptes "operateur plateforme" (toi, pas un role d'entreprise).
// Volontairement en dur : une seule personne aujourd'hui, pas de table ni
// d'UI de gestion a construire pour ca. La vraie barriere reste le check
// cote server function (announcements.functions.ts) ; ce fichier sert aussi
// cote client pour cacher l'entree du menu/la page aux autres comptes.
export const PLATFORM_ADMIN_EMAILS = ["cadexleader@gmail.com"];

export function isPlatformAdmin(email: string | null | undefined) {
  return !!email && PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
}
