/**
 * Filigrane GestioPro appliqué UNIQUEMENT au moment du partage (jamais sur
 * le fichier stocké/original) — un petit badge discret en bas à droite,
 * marketing léger pour l'app quand une photo circule chez un client.
 */
import logoIcon from "@/assets/gestiopro-icon.webp";

let cachedLogo: HTMLImageElement | null = null;

function loadImage(src: string, crossOrigin?: "anonymous"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = src;
  });
}

async function getLogo(): Promise<HTMLImageElement> {
  if (!cachedLogo) cachedLogo = await loadImage(logoIcon);
  return cachedLogo;
}

/** Dimensions redimensionnées (plus grand côté borné à SHARE_MAX_DIM),
 * préservant le ratio — partagée entre le chemin normal et le repli. */
function fitDims(w: number, h: number, maxDim: number): { w: number; h: number } {
  if (w <= maxDim && h <= maxDim) return { w, h };
  const scale = maxDim / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Retourne une nouvelle image (Blob JPEG) avec le badge GestioPro apposé.
 * En cas d'échec (CORS, image inaccessible…), retourne l'image d'origine
 * inchangée plutôt que de bloquer le partage.
 */
// Redimensionne au partage (1600px sur le plus grand côté — largement
// suffisant pour l'affichage WhatsApp, qui recompresse de toute façon) et
// baisse légèrement la qualité JPEG : les photos d'origine, prises en plein
// résolution par l'appareil photo du téléphone, rendaient l'envoi WhatsApp
// lent et parfois refusé par l'API de partage native (taille totale trop
// grande). Aucun impact sur la photo stockée en base, uniquement sur la
// copie envoyée au client.
const SHARE_MAX_DIM = 1600;
const SHARE_JPEG_QUALITY = 0.82;

export async function watermarkImage(url: string): Promise<Blob> {
  try {
    const [photo, logo] = await Promise.all([loadImage(url, "anonymous"), getLogo()]);

    const { w, h } = fitDims(photo.naturalWidth, photo.naturalHeight, SHARE_MAX_DIM);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");

    ctx.drawImage(photo, 0, 0, w, h);

    // Badge : icône + "GestioPro" sur un fond clair semi-transparent,
    // dimensionné proportionnellement à l'image pour rester lisible sur
    // une petite comme une grande photo.
    const pad = Math.round(canvas.width * 0.018);
    const logoSize = Math.max(20, Math.round(canvas.width * 0.045));
    const fontSize = Math.max(12, Math.round(logoSize * 0.62));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    const label = "GestioPro";
    const textWidth = ctx.measureText(label).width;

    const badgeW = logoSize + 10 + textWidth + pad * 2;
    const badgeH = logoSize + pad * 1.1;
    const x = canvas.width - badgeW - pad;
    const y = canvas.height - badgeH - pad;
    const r = badgeH / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + badgeW, y, x + badgeW, y + badgeH, r);
    ctx.arcTo(x + badgeW, y + badgeH, x, y + badgeH, r);
    ctx.arcTo(x, y + badgeH, x, y, r);
    ctx.arcTo(x, y, x + badgeW, y, r);
    ctx.closePath();
    ctx.fill();

    const logoY = y + (badgeH - logoSize) / 2;
    ctx.drawImage(logo, x + pad, logoY, logoSize, logoSize);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + pad + logoSize + 10, y + badgeH / 2);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export impossible"))), "image/jpeg", SHARE_JPEG_QUALITY);
    });
  } catch {
    // Filigrane indisponible (CORS sur la photo ou le logo, réseau…) : on
    // part sur l'original SANS badge plutôt que d'empêcher le partage — mais
    // on le redimensionne quand même. Sans ce repli, une photo qui échoue au
    // filigrane repartait en pleine résolution d'origine (parfois plusieurs
    // Mo), gonflant le poids total du partage au point que l'API de partage
    // native refuse et retombe sur un téléchargement local au lieu d'envoyer
    // directement vers WhatsApp — symptôme réel observé : un véhicule se
    // partage sans souci, un autre (photo différente) force le
    // téléchargement, selon que sa photo passe ou non le chargement CORS.
    try {
      const res = await fetch(url);
      const rawBlob = await res.blob();
      const objectUrl = URL.createObjectURL(rawBlob);
      try {
        // Chargé depuis un blob: local (même origine) — pas de restriction
        // CORS, le canvas n'est jamais "tainted" ici, contrairement à un
        // chargement direct depuis l'URL distante.
        const img = await loadImage(objectUrl);
        const { w, h } = fitDims(img.naturalWidth, img.naturalHeight, SHARE_MAX_DIM);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return rawBlob;
        ctx.drawImage(img, 0, 0, w, h);
        return await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob ?? rawBlob), "image/jpeg", SHARE_JPEG_QUALITY);
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      // Vraiment rien ne fonctionne (réseau coupé...) : au moins tenter le
      // partage avec l'original plutôt que de bloquer complètement.
      const res = await fetch(url);
      return await res.blob();
    }
  }
}
