/**
 * Filigrane GestioPro appliqué UNIQUEMENT au moment du partage (jamais sur
 * le fichier stocké/original) — un petit badge discret en bas à droite,
 * marketing léger pour l'app quand une photo circule chez un client.
 */
import logoIcon from "@/assets/gestiopro-icon.png";

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

/**
 * Retourne une nouvelle image (Blob JPEG) avec le badge GestioPro apposé.
 * En cas d'échec (CORS, image inaccessible…), retourne l'image d'origine
 * inchangée plutôt que de bloquer le partage.
 */
export async function watermarkImage(url: string): Promise<Blob> {
  try {
    const [photo, logo] = await Promise.all([loadImage(url, "anonymous"), getLogo()]);

    const canvas = document.createElement("canvas");
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");

    ctx.drawImage(photo, 0, 0);

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
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export impossible"))), "image/jpeg", 0.92);
    });
  } catch {
    // Filigrane indisponible (CORS, réseau…) : on part sur l'original plutôt
    // que d'empêcher le partage.
    const res = await fetch(url);
    return await res.blob();
  }
}
