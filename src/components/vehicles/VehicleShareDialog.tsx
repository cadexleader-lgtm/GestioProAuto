import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, Send } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/lib/demo-data";
import { useCompanyProfile } from "@/lib/company-profile";
import { buildVehicleShareMessage, shareVehicleToClient, type ShareProgress } from "@/lib/vehicle-share";
import { Progress } from "@/components/ui/progress";

export function VehicleShareDialog({ vehicle, open, onOpenChange }: {
  vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const profile = useCompanyProfile();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ShareProgress | null>(null);

  const media = useMemo(() => {
    if (!vehicle) return [] as string[];
    const gallery = vehicle.photos ?? [];
    return [vehicle.image, ...gallery].filter((u): u is string => !!u);
  }, [vehicle]);

  useEffect(() => {
    if (!open || !vehicle) return;
    setMessage(buildVehicleShareMessage(vehicle, profile));
    setPhone("");
    setExcluded(new Set());
    setSending(false);
    setProgress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id]);

  if (!vehicle) return null;

  const toggle = (url: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });

  const selectedPhotos = media.filter((u) => !excluded.has(u));

  const send = async () => {
    if (sending) return;
    if (selectedPhotos.length === 0) {
      toast.error("Sélectionnez au moins une photo à envoyer.");
      return;
    }
    setSending(true);
    setProgress({ stage: "processing", done: 0, total: selectedPhotos.length });
    try {
      const result = await shareVehicleToClient({
        vehicle,
        message,
        photoUrls: selectedPhotos,
        clientPhone: phone,
        onProgress: setProgress,
      });
      if (result.method === "share") {
        toast.success("Partagé — sélectionnez WhatsApp dans la fenêtre qui s'est ouverte.");
      } else {
        toast.success("Photos téléchargées et WhatsApp ouvert avec le message.", {
          description: "Joignez les photos téléchargées au message avant de l'envoyer.",
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le partage a échoué.");
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send size={18} /> Partager avec un client</DialogTitle>
          <DialogDescription>{vehicle.brand} {vehicle.model} · {vehicle.plate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {media.length > 0 && (
            <div>
              <Label>Médias à envoyer</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {media.map((url, i) => {
                  const on = !excluded.has(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => toggle(url)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition ${on ? "border-primary" : "border-transparent opacity-40"}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {on && (
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check size={10} />
                        </span>
                      )}
                      {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center">Couverture</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Un badge GestioPro discret est ajouté aux photos envoyées.</p>
            </div>
          )}

          <div>
            <Label>Message</Label>
            <Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-xl mt-1.5 text-sm" />
          </div>

          <div>
            <Label>Numéro du client (optionnel)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 ..." className="rounded-xl mt-1.5" />
            <p className="text-[11px] text-muted-foreground mt-1">Laissez vide pour choisir le contact directement dans WhatsApp.</p>
          </div>

          {progress && (
            <div className="space-y-1.5">
              <Progress
                value={progress.stage === "sending" ? 100 : (progress.done / Math.max(1, progress.total)) * 100}
              />
              <p className="text-[11px] text-muted-foreground">
                {progress.stage === "sending"
                  ? "Envoi vers WhatsApp…"
                  : `Préparation des photos… ${progress.done}/${progress.total}`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuler</Button>
          <Button onClick={() => void send()} disabled={sending} className="gap-1.5">
            <Send size={15} /> {sending ? "Envoi..." : "Partager sur WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
