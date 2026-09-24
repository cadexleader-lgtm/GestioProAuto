import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Satellite, Copy, Trash2, LocateFixed, Eye, EyeOff } from "lucide-react";
import { db } from "@/lib/demo-store";
import type { Vehicle } from "@/lib/demo-data";

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function copy(text: string, label: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(`${label} copié`),
    () => toast.error("Impossible de copier — copiez manuellement."),
  );
}

/**
 * Attache/retire un traceur GPS physique à un véhicule, et permet de saisir
 * une position manuellement en attendant (ou en complément) un vrai boîtier.
 * L'URL webhook générée fonctionne avec n'importe quel tracker ou plateforme
 * de télématique (ex. Traccar) capable d'appeler une URL HTTP en POST —
 * voir src/lib/gps/ingest.server.ts pour le format exact attendu.
 */
export function VehicleTrackerDialog({ vehicle, open, onOpenChange }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [deviceId, setDeviceId] = useState("");
  const [provider, setProvider] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setDeviceId("");
      setProvider("");
      setShowToken(false);
      setLat(vehicle.lastPosition?.lat?.toString() ?? "");
      setLng(vehicle.lastPosition?.lng?.toString() ?? "");
    }
  }, [vehicle?.id]);

  if (!vehicle) return null;

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/gps/ping` : "/api/gps/ping";

  const attach = () => {
    if (!deviceId.trim()) return toast.error("Identifiant du tracker requis (IMEI ou numéro de série)");
    db.update("vehicles", vehicle.id, {
      tracker: {
        deviceId: deviceId.trim(),
        provider: provider.trim() || undefined,
        webhookToken: randomToken(),
        addedAt: new Date().toISOString(),
      },
    });
    toast.success("Tracker associé — configurez l'URL webhook sur votre boîtier");
  };

  const detach = () => {
    db.update("vehicles", vehicle.id, { tracker: undefined });
    toast.success("Tracker retiré du véhicule");
  };

  const saveManualPosition = () => {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
      return toast.error("Coordonnées invalides");
    }
    db.update("vehicles", vehicle.id, {
      lastPosition: { lat: la, lng: ln, recordedAt: new Date().toISOString(), source: "manual" },
    });
    toast.success("Position mise à jour");
    onOpenChange(false);
  };

  const useMyPosition = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation non disponible sur cet appareil");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("Position actuelle récupérée — cliquez sur Enregistrer");
      },
      () => { setLocating(false); toast.error("Position refusée ou indisponible"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Satellite size={18} /> Tracker GPS — {vehicle.brand} {vehicle.model}</DialogTitle>
          <DialogDescription>{vehicle.plate}</DialogDescription>
        </DialogHeader>

        {vehicle.tracker ? (
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{vehicle.tracker.deviceId}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.tracker.provider || "Fournisseur non précisé"} · associé le {new Date(vehicle.tracker.addedAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Actif</Badge>
              </div>

              <div>
                <Label className="text-xs">URL webhook (à configurer sur votre boîtier/plateforme GPS)</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input readOnly value={webhookUrl} className="text-xs font-mono" />
                  <Button type="button" size="icon" variant="outline" onClick={() => copy(webhookUrl, "URL")}><Copy size={14} /></Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Token secret</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input readOnly type={showToken ? "text" : "password"} value={vehicle.tracker.webhookToken} className="text-xs font-mono" />
                  <Button type="button" size="icon" variant="outline" onClick={() => setShowToken((v) => !v)}>{showToken ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                  <Button type="button" size="icon" variant="outline" onClick={() => copy(vehicle.tracker!.webhookToken, "Token")}><Copy size={14} /></Button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                Requête POST attendue : <code className="font-mono">{`{"deviceId":"${vehicle.tracker.deviceId}","token":"…","lat":6.37,"lng":2.39}`}</code>
              </p>

              <Button type="button" variant="outline" size="sm" className="w-full text-rose-600 hover:text-rose-700" onClick={detach}>
                <Trash2 size={14} /> Retirer ce tracker
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Associez un boîtier GPS physique pour que ce véhicule remonte sa position automatiquement.
              Une URL webhook unique sera générée pour ce véhicule.
            </p>
            <div><Label>Identifiant du tracker (IMEI, n° de série)</Label><Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="ex. 865432101234567" /></div>
            <div><Label>Fournisseur (optionnel)</Label><Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="ex. Teltonika, Concox, Traccar…" /></div>
            <Button type="button" onClick={attach} className="w-full">Associer ce tracker</Button>
          </div>
        )}

        <div className="mt-5 pt-4 border-t space-y-3">
          <p className="text-sm font-semibold">Position manuelle</p>
          <p className="text-xs text-muted-foreground">
            En attendant un vrai tracker (ou en complément), vous pouvez renseigner la position vous-même.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="6.3703" /></div>
            <div><Label className="text-xs">Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="2.3912" /></div>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={useMyPosition} disabled={locating}>
            <LocateFixed size={14} /> {locating ? "Localisation..." : "Utiliser ma position actuelle"}
          </Button>
          {vehicle.lastPosition && (
            <p className="text-[11px] text-muted-foreground">
              Dernière position {vehicle.lastPosition.source === "webhook" ? "(tracker)" : "(manuelle)"} : {new Date(vehicle.lastPosition.recordedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={saveManualPosition}>Enregistrer la position</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
