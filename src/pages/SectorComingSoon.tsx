import { Card, CardContent } from "@/components/ui/card";
import type { SectorConfig } from "@/lib/sectors";
import { Sparkles, CheckCircle2 } from "lucide-react";

export function SectorComingSoon({ sector }: { sector: SectorConfig }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
          Module {sector.label}
        </h1>
        <p className="text-muted-foreground mt-1">{sector.description}</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={26} />
          </div>
          <h2 className="font-display text-xl font-semibold">Bientôt disponible</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Le module <strong>{sector.label}</strong> est en cours de finalisation.
            Vous pouvez d'ores et déjà utiliser les fonctions transverses (clients, rapports, paramètres).
          </p>

          <div className="mx-auto mt-8 grid max-w-md gap-2 text-left">
            {[
              "Dashboard métier dédié",
              "Workflow et formulaires sur mesure",
              "Rapports et exports PDF premium",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
