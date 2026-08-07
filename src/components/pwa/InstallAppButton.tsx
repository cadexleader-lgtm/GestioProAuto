import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Bouton « Installer l'application » (desktop & mobile), masqué si déjà installée. */
export function InstallAppButton({ className, variant = "outline", label = "Installer l'app" }: {
  className?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  label?: string;
}) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIos) return null;

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setIosHelp(true);
  };

  return (
    <>
      <Button variant={variant} size="sm" onClick={click} className={cn("gap-1.5", className)}>
        <Download size={15} />
        <span className="hidden sm:inline">{label}</span>
      </Button>

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Installer GestioPro</DialogTitle>
            <DialogDescription>Ajoutez l'application à votre écran d'accueil en 2 étapes.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Share size={15} /></span>
              <span>Appuyez sur le bouton <strong>Partager</strong> dans la barre de Safari.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Plus size={15} /></span>
              <span>Choisissez <strong>« Sur l'écran d'accueil »</strong> puis <strong>Ajouter</strong>.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
