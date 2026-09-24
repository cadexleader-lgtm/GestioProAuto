/**
 * Point d'entrée public (sans auth Supabase) pour les positions GPS envoyées
 * par un vrai boîtier tracker ou une plateforme de télématique (ex. Traccar)
 * configurée avec l'URL webhook affichée dans "Ajouter un tracker" (UI GPS).
 *
 * Pas de JWT utilisateur possible ici — l'appelant est un appareil, pas une
 * session connectée. L'authentification se fait par la paire
 * (deviceId, webhookToken) : le token est un secret aléatoire généré côté
 * client à l'attachement du tracker, stocké dans vehicles.data.tracker.
 * Intercepté directement dans src/server.ts, AVANT le routeur TanStack Start
 * (qui applique une protection CSRF sur ses propres server functions —
 * bloquerait toute requête cross-origin d'un appareil externe).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleGpsPing(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  if (!deviceId || !token) {
    return json({ error: "deviceId et token requis" }, 400);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json({ error: "lat/lng invalides" }, 400);
  }

  const { data: matches, error } = await supabaseAdmin
    .from("vehicles")
    .select("id, company_id, data")
    .eq("data->tracker->>deviceId", deviceId);

  if (error) {
    console.error("[gps-ingest] lookup failed", error);
    return json({ error: "Erreur serveur" }, 500);
  }

  const vehicle = (matches ?? []).find((v: any) => v.data?.tracker?.webhookToken === token);
  if (!vehicle) {
    return json({ error: "Tracker inconnu ou token invalide" }, 403);
  }

  const speedKmh = Number(body?.speedKmh);
  const heading = Number(body?.heading);
  const recordedAt = typeof body?.recordedAt === "string" && !Number.isNaN(Date.parse(body.recordedAt))
    ? body.recordedAt
    : new Date().toISOString();

  const nextData = {
    ...(vehicle as any).data,
    lastPosition: {
      lat, lng,
      ...(Number.isFinite(speedKmh) ? { speedKmh } : {}),
      ...(Number.isFinite(heading) ? { heading } : {}),
      recordedAt,
      source: "webhook" as const,
    },
  };

  const { error: updateError } = await supabaseAdmin
    .from("vehicles")
    .update({ data: nextData })
    .eq("company_id", (vehicle as any).company_id)
    .eq("id", (vehicle as any).id);

  if (updateError) {
    console.error("[gps-ingest] update failed", updateError);
    return json({ error: "Erreur serveur" }, 500);
  }

  return json({ ok: true }, 200);
}
