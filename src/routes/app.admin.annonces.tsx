import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, Mail } from "lucide-react";
import { useTenant } from "@/lib/tenant";
import { isPlatformAdmin } from "@/lib/admin";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { previewAnnouncementRecipients, sendAnnouncement } from "@/lib/api/announcements.functions";

export const Route = createFileRoute("/app/admin/annonces")({
  head: () => ({ meta: [{ title: "Annonces — GestioAuto" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminAnnoncesPage,
});

function AdminAnnoncesPage() {
  const { email, loading } = useTenant();

  if (loading) return null;
  if (!isPlatformAdmin(email)) {
    return <RestrictedAccess title="Annonces" message="Cet outil est réservé à l'administrateur de la plateforme." />;
  }
  return <AnnouncementComposer />;
}

function AnnouncementComposer() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReal, setSendingReal] = useState(false);
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  const sendTest = async () => {
    if (!canSend || sendingTest) return;
    setSendingTest(true);
    try {
      await sendAnnouncement({ data: { subject: subject.trim(), body: body.trim(), testMode: true } });
      toast.success("Email de test envoyé à votre propre adresse.");
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'envoi du test.");
    } finally {
      setSendingTest(false);
    }
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const result = await previewAnnouncementRecipients();
      setPreview(result);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de charger les destinataires.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendReal = async () => {
    if (!canSend || sendingReal) return;
    setSendingReal(true);
    try {
      const result = await sendAnnouncement({ data: { subject: subject.trim(), body: body.trim(), testMode: false } });
      toast.success(`Annonce envoyée à ${result.sent} entreprise${result.sent > 1 ? "s" : ""}.`);
      setSubject("");
      setBody("");
      setPreview(null);
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'envoi.");
    } finally {
      setSendingReal(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Annonces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envoie une annonce (nouveauté, mise à jour, information) à toutes les entreprises clientes de GestioAuto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rédiger</CardTitle>
          <CardDescription>Le texte est mis en forme automatiquement dans le gabarit email GestioAuto (une ligne vide sépare les paragraphes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-subject">Objet</Label>
            <Input id="ann-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex : Nouveauté — Suivi GPS de votre parc" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Bonjour,&#10;&#10;Nous venons d'ajouter..." />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={sendTest} disabled={!canSend || sendingTest}>
              {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Envoyer un test (à moi-même)
            </Button>

            <AlertDialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (open) loadPreview(); }}>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={!canSend}>
                  <Send size={16} /> Envoyer à tous les clients
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Envoyer cette annonce à tous les clients ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {loadingPreview
                      ? "Chargement du nombre de destinataires…"
                      : preview
                        ? `Cet email sera envoyé à ${preview.count} entreprise${preview.count > 1 ? "s" : ""} (une par patron). Envoie d'abord un test pour vérifier le rendu.`
                        : "Impossible de charger les destinataires."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={sendingReal || loadingPreview || !preview?.count}
                    onClick={(e) => { e.preventDefault(); sendReal(); }}
                  >
                    {sendingReal ? <Loader2 size={16} className="animate-spin" /> : null}
                    Confirmer l'envoi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
