/**
 * Persistance durable (IndexedDB — contrairement à `form-draft.ts`, un
 * `File`/`Blob` ne tient pas dans localStorage) d'un fichier capturé en
 * attente d'envoi. Sur mobile, ouvrir l'appareil photo ou le sélecteur de
 * fichiers natif peut faire perdre tout l'état React en mémoire au retour
 * dans l'app (page rechargée par l'OS ou par notre propre filet de
 * sécurité chunk-error) — un fichier déjà capturé mais pas encore envoyé
 * doit survivre à ça, pas juste disparaître ("je perds ma photo").
 * Best-effort partout : IndexedDB indisponible (navigation privée stricte,
 * quota…) ne doit jamais bloquer le flux d'upload lui-même.
 */

const DB_NAME = "gestioauto-pending-captures";
const STORE_NAME = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface PendingCapture {
  file: File;
  meta: Record<string, unknown>;
  savedAt: number;
}

export async function savePendingCapture(key: string, file: File, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ file, meta, savedAt: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Best-effort — voir commentaire d'en-tête.
  }
}

export async function loadPendingCapture(key: string): Promise<PendingCapture | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as PendingCapture | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearPendingCapture(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // idem
  }
}
