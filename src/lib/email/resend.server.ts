// Client Resend cote serveur uniquement (cle API jamais exposee au client).
// Meme patron que client.server.ts : singleton paresseux via Proxy, import
// dynamique depuis les handlers de server functions.
import { Resend } from "resend";

function createResendClient() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    throw new Error("Variable d'environnement manquante : RESEND_API_KEY.");
  }
  return new Resend(RESEND_API_KEY);
}

let _resend: Resend | undefined;

export const resend = new Proxy({} as Resend, {
  get(_, prop, receiver) {
    if (!_resend) _resend = createResendClient();
    return Reflect.get(_resend, prop, receiver);
  },
});

export const EMAIL_FROM_ANNOUNCEMENTS =
  process.env.RESEND_FROM_ANNOUNCEMENTS || "GestioAuto <contact@gestioauto.com>";
