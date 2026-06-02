import {
  useListOrders,
  useUpdateOrderStatus,
  type RestaurantOrder,
  type OrderStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChefHat, Bell, Timer, ArrowRight } from "lucide-react";
import { formatFCFA } from "@/lib/format";

const COLUMNS: { status: OrderStatus; title: string; next: OrderStatus | null; nextLabel: string; accent: string }[] = [
  { status: "new", title: "Nouvelles", next: "cooking", nextLabel: "Lancer", accent: "border-sky-300 bg-sky-50" },
  { status: "cooking", title: "En cuisine", next: "ready", nextLabel: "Marquer prêt", accent: "border-amber-300 bg-amber-50" },
  { status: "ready", title: "Prêtes à servir", next: "served", nextLabel: "Servi", accent: "border-emerald-300 bg-emerald-50" },
];

function minutesAgo(iso: string) {
  return Math.max(1, Math.round((Date.now() - +new Date(iso)) / 60000));
}

export function RestaurantKitchen() {
  const { data: orders, isLoading } = useListOrders({ status: "active" });
  const update = useUpdateOrderStatus();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ChefHat size={22} />
          </span>
          Cuisine
        </h1>
        <p className="text-muted-foreground mt-1">
          Workflow de préparation en temps réel. Glissez d'une colonne à l'autre.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = (orders ?? []).filter((o) => o.status === col.status);
            return (
              <div key={col.status} className={`rounded-2xl border-2 ${col.accent} p-3`}>
                <div className="flex items-center justify-between px-2 pb-3">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider">
                    {col.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow-sm">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
                  {list.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-current/20 p-6 text-center text-xs text-muted-foreground">
                      Aucune commande.
                    </p>
                  ) : (
                    list.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        next={col.next}
                        nextLabel={col.nextLabel}
                        onAdvance={() => col.next && update.mutate({ id: o.id, status: col.next })}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  next,
  nextLabel,
  onAdvance,
}: {
  order: RestaurantOrder;
  next: OrderStatus | null;
  nextLabel: string;
  onAdvance: () => void;
}) {
  const mins = minutesAgo(order.createdAt);
  const isLate = mins > 20 && order.status !== "ready";

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-sm font-bold">{order.reference}</p>
            <p className="text-xs text-muted-foreground">
              Table {order.tableNumber} · {order.server}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              isLate ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Timer size={11} /> {mins} min
          </span>
        </div>
        <ul className="mt-3 space-y-1">
          {order.items.map((it, idx) => (
            <li key={idx} className="flex items-baseline justify-between text-sm">
              <span className="truncate">
                <strong className="font-semibold text-foreground">{it.quantity}×</strong>{" "}
                <span className="text-foreground">{it.dishName}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm font-semibold">{formatFCFA(order.total)}</span>
          {next && (
            <Button size="sm" onClick={onAdvance} className="rounded-lg">
              {order.status === "ready" && <Bell size={12} className="mr-1.5" />}
              {nextLabel} <ArrowRight size={12} className="ml-1.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
