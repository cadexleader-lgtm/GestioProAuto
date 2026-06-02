import { useState } from "react";
import {
  useListRestaurantTables,
  useUpdateTableStatus,
  type RestaurantTable,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, QrCode, Download } from "lucide-react";

const STATUS_BADGE: Record<RestaurantTable["status"], { label: string; cls: string }> = {
  free: { label: "Libre", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  occupied: { label: "Occupée", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  reserved: { label: "Réservée", cls: "bg-amber-100 text-amber-700 border-amber-200" },
};

export function RestaurantTables() {
  const { data: tables, isLoading } = useListRestaurantTables();
  const updateStatus = useUpdateTableStatus();
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);

  const qrUrl = (data: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(data)}`;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Tables</h1>
        <p className="text-muted-foreground mt-1">
          Plan de salle, statut en direct, QR codes uniques pour commander.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables?.map((t) => {
            const badge = STATUS_BADGE[t.status];
            const ringByStatus = {
              free: "ring-emerald-200/60",
              occupied: "ring-rose-200/60",
              reserved: "ring-amber-200/60",
            }[t.status];
            return (
              <Card key={t.id} className={`relative ring-1 ${ringByStatus} hover:-translate-y-0.5 transition`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Table</p>
                      <p className="font-display text-3xl font-bold">{t.number}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users size={12} /> {t.seats} couverts
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setQrTable(t)}
                    >
                      <QrCode size={14} className="mr-1.5" /> QR
                    </Button>
                    <select
                      value={t.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: t.id, status: e.target.value as RestaurantTable["status"] })
                      }
                      className="flex-1 rounded-md border bg-card px-2 text-xs font-medium"
                    >
                      <option value="free">Libre</option>
                      <option value="occupied">Occupée</option>
                      <option value="reserved">Réservée</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!qrTable} onOpenChange={(o) => !o && setQrTable(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — Table {qrTable?.number}</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <img
                src={qrUrl(qrTable.qrCode)}
                alt={`QR code Table ${qrTable.number}`}
                className="h-64 w-64 rounded-xl border bg-white p-3"
              />
              <p className="text-center text-xs text-muted-foreground">
                Imprimez et placez sur la table. Le client scanne pour commander depuis son téléphone.
              </p>
              <Button asChild className="w-full" variant="outline">
                <a href={qrUrl(qrTable.qrCode)} download={`table-${qrTable.number}.png`}>
                  <Download size={14} className="mr-2" /> Télécharger
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
