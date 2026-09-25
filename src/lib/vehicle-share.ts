/**
 * Partage client d'une fiche véhicule (photos + argumentaire) par WhatsApp.
 * Contrainte réelle à connaître avant de toucher à ce fichier : un lien
 * wa.me ne peut PRÉ-REMPLIR qu'un texte, jamais joindre un fichier
 * (limitation WhatsApp, pas de l'app) — seule l'API Web Share native
 * (mobile/PWA installée) permet d'envoyer texte + médias en un seul geste
 * vers WhatsApp. Sur desktop ou navigateur non compatible, on retombe sur
 * un téléchargement des médias + ouverture de WhatsApp avec le message
 * prérempli, et on le dit clairement à l'utilisateur (voir toast appelant).
 *
 * Vidéo volontairement exclue du partage (même si le véhicule en a une,
 * champ conservé et toujours affiché sur la fiche véhicule) : c'était le
 * plus gros contributeur de poids, rendant l'envoi lent et parfois refusé
 * par l'API de partage native (taille totale trop grande pour l'OS).
 */
import type { Vehicle } from "@/lib/demo-data";
import type { CompanyProfile } from "@/lib/company-profile";
import { formatFCFA } from "@/lib/format";
import { watermarkImage } from "@/lib/watermark";
import { withWakeLock } from "@/lib/wake-lock";

export function buildVehicleShareMessage(vehicle: Vehicle, profile: CompanyProfile): string {
  const lines = [
    `🚗 *${vehicle.brand} ${vehicle.model}* (${vehicle.year})`,
    "",
    `🎨 Couleur : ${vehicle.color}`,
    `⚙️ ${vehicle.transmission} · ${vehicle.fuel}`,
    `🛣️ Kilométrage : ${vehicle.mileageKm.toLocaleString("fr-FR")} km`,
    "",
    `💰 Prix : *${formatFCFA(vehicle.sellingPrice)}*`,
    "",
    "Véhicule disponible dès maintenant — contactez-nous pour une visite ou plus d'informations !",
  ];
  const contact = [profile.name, profile.phone, profile.city].filter(Boolean).join(" · ");
  if (contact) { lines.push(""); lines.push(`📞 ${contact}`); }
  return lines.join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export interface ShareVehicleResult {
  method: "share" | "download";
}

export type ShareProgress =
  | { stage: "processing"; done: number; total: number }
  | { stage: "sending" };

export async function shareVehicleToClient(opts: {
  vehicle: Vehicle;
  message: string;
  photoUrls: string[];
  clientPhone?: string;
  onProgress?: (p: ShareProgress) => void;
}): Promise<ShareVehicleResult> {
  return withWakeLock(async () => {
    const total = opts.photoUrls.length;
    const photoFiles: File[] = [];
    for (let i = 0; i < total; i++) {
      opts.onProgress?.({ stage: "processing", done: i, total });
      const blob = await watermarkImage(opts.photoUrls[i]);
      photoFiles.push(new File([blob], `${opts.vehicle.plate || "vehicule"}-${i + 1}.jpg`, { type: "image/jpeg" }));
    }
    opts.onProgress?.({ stage: "processing", done: total, total });

    const files = photoFiles;
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };

    if (nav.share && files.length > 0 && (!nav.canShare || nav.canShare({ files }))) {
      try {
        opts.onProgress?.({ stage: "sending" });
        await nav.share({ text: opts.message, files });
        return { method: "share" as const };
      } catch (error) {
        // Annulé par l'utilisateur depuis la feuille de partage native : pas une erreur.
        if (error instanceof Error && error.name === "AbortError") return { method: "share" as const };
        // Autre échec (ex. taille totale refusée par l'OS) : on retombe sur le téléchargement.
      }
    }

    files.forEach((file, i) => setTimeout(() => downloadBlob(file, file.name), i * 250));
    const phone = opts.clientPhone?.replace(/[^\d]/g, "");
    const waUrl = `https://wa.me/${phone || ""}?text=${encodeURIComponent(opts.message)}`;
    window.open(waUrl, "_blank");
    return { method: "download" as const };
  });
}
