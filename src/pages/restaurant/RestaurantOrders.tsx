import { useState } from "react";
import {
  useListOrders,
  useUpdateOrderStatus,
  type OrderStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { Receipt, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS: { id: OrderStatus | "all" | "active"; label: string }[] = [
  { id: "active", label: "En cours" },
  { id: "new", label: "Nouvelles" },
  { id: "cooking", label: "En cuisine" },
  { id: "ready", label: "Prêtes" },
  { id: "served", label: "Servies" },
  { id: "paid", label: "Payées" },
  { id: "all", label: "Toutes" },
];

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: "Nouvelle", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  cooking: { label: "En cuisine", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  ready: { label: "Prête", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  served: { label: "Servie", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  paid: { label: "Payée", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function RestaurantOrders() {
  const [filter, setFilter] = useState<OrderStatus | "all" | "active">("active");
  const { data: orders, isLoading } = useListOrders({ status: filter });
  const update = useUpdateOrderStatus();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Commandes</h1>
        <p className="text-muted-foreground mt-1">
          Suivi complet : nouvelle → cuisine → prête → servie → payée.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setFilter(o.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">Réf.</th>
                    <th className="px-6 py-3 text-left font-semibold">Table</th>
                    <th className="px-6 py-3 text-left font-semibold">Serveur</th>
                    <th className="px-6 py-3 text-left font-semibold">Détail</th>
                    <th className="px-6 py-3 text-right font-semibold">Total</th>
                    <th className="px-6 py-3 text-left font-semibold">Statut</th>
                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(orders ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                        Aucune commande.
                      </td>
                    </tr>
                  ) : (
                    orders!.map((o) => {
                      const badge = STATUS_BADGE[o.status];
                      return (
                        <tr key={o.id} className="hover:bg-muted/30">
                          <td className="px-6 py-3 font-medium">{o.reference}</td>
                          <td className="px-6 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold">
                              {o.tableNumber}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">{o.server}</td>
                          <td className="px-6 py-3 text-muted-foreground max-w-[260px] truncate">
                            {o.items.map((it) => `${it.quantity}× ${it.dishName}`).join(", ")}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold">{formatFCFA(o.total)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {o.status === "served" ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  update.mutate({ id: o.id, status: "paid" });
                                  toast.success(`${o.reference} encaissée`);
                                }}
                              >
                                <Receipt size={14} className="mr-1.5" /> Encaisser
                              </Button>
                            ) : o.status !== "paid" ? (
                              <Button size="sm" variant="outline" disabled className="opacity-50">
                                En attente <ArrowRight size={12} className="ml-1" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
