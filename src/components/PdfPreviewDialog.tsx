import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import type { PdfDoc } from "@/lib/pdf/engine";

/**
 * Aperçu d'un PDF avant tout téléchargement/impression — remplace l'ancien
 * comportement où chaque génération de PDF déclenchait un téléchargement
 * immédiat et silencieux (le modèle lui-même appelait `.save()`). Le
 * téléchargement se fait via un lien `<a download>` cliqué par script
 * (jamais bloqué par le navigateur, contrairement à `window.open` après un
 * `await` réseau) ; "Ouvrir" utilise `window.open`, mais depuis un clic
 * direct sur ce bouton — donc jamais bloqué non plus.
 */
export function PdfPreviewDialog({
  open, onOpenChange, url, filename, title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL `blob:` du document — `null` tant que la génération est en cours. */
  url: string | null;
  filename: string;
  title: string;
}) {
  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-base truncate pr-6">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted/40">
          {url ? (
            <iframe src={url} title={title} className="w-full h-full border-0" />
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground gap-2">
              <Loader2 size={20} className="animate-spin" /> Génération du document…
            </div>
          )}
        </div>
        <DialogFooter className="p-3 border-t shrink-0 flex-row justify-end gap-2">
          <Button variant="outline" disabled={!url} onClick={() => url && window.open(url, "_blank")}>
            <ExternalLink size={15} /> Ouvrir
          </Button>
          <Button disabled={!url} onClick={download}>
            <Download size={15} /> Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** État + actions pour piloter `PdfPreviewDialog` sans dupliquer 3 `useState`
 * à chaque page qui génère un PDF. `show()` accepte le `PdfDoc` retourné par
 * les générateurs de vehicle-pdf.ts / pdf/templates.ts. */
export function usePdfPreview() {
  const [state, setState] = useState<{ open: boolean; url: string | null; filename: string; title: string }>({
    open: false, url: null, filename: "", title: "",
  });

  const show = (doc: PdfDoc, filename: string, title: string) => {
    setState({ open: true, url: doc.objectUrl(), filename, title });
  };

  return {
    open: state.open,
    url: state.url,
    filename: state.filename,
    title: state.title,
    show,
    onOpenChange: (open: boolean) => setState((s) => ({ ...s, open })),
  };
}
