/**
 * Brouillon de formulaire persisté dans localStorage — survit à un
 * rechargement complet de page (ex : sur mobile, ouvrir le sélecteur de
 * fichiers natif peut suspendre/recharger l'onglet en arrière-plan sur les
 * appareils d'entrée de gamme, ce qui perd tout état React en mémoire).
 * Limite assumée : seules les valeurs sérialisables (texte, nombres) sont
 * conservées — les fichiers déjà choisis (photos, documents, vidéo) ne
 * peuvent pas survivre à un rechargement et doivent être rechoisis.
 */
export function saveDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Stockage indisponible (navigation privée, quota dépassé…) — le
    // brouillon est une aide de confort, pas une garantie ; on continue sans.
  }
}

/** Brouillons de plus de 24h ignorés (probablement une saisie abandonnée,
 * pas celle qu'on vient d'interrompre). */
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; value: T };
    if (!parsed || Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // idem — jamais bloquant.
  }
}
