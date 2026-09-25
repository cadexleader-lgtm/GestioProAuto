/**
 * Empêche l'écran de s'éteindre pendant une opération longue (upload
 * photos, envoi WhatsApp, enregistrement d'un véhicule) — sur mobile, la
 * mise en veille de l'écran peut suspendre/recharger l'onglet en
 * arrière-plan (surtout sur les appareils d'entrée de gamme), ce qui
 * interrompt l'opération en cours et perd sa progression.
 * API standard (Chrome/Android bien supporté, dégrade gracieusement
 * ailleurs — Safari/iOS n'a pas toujours le support, jamais bloquant).
 */
type WakeLockSentinel = { release: () => Promise<void> };

export async function withWakeLock<T>(task: () => Promise<T>): Promise<T> {
  let sentinel: WakeLockSentinel | null = null;
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } }).wakeLock;
    sentinel = (await wl?.request("screen").catch(() => null)) ?? null;
  } catch {
    // API indisponible — on continue sans, ce n'est qu'une optimisation.
  }
  try {
    return await task();
  } finally {
    sentinel?.release().catch(() => {});
  }
}
