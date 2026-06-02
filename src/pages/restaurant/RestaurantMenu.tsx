import { useState } from "react";
import { useListDishes, useToggleDishAvailability } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Search, Plus, Clock } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";

const CATEGORIES = ["all", "Entrées", "Plats", "Grillades", "Boissons", "Desserts"];

export function RestaurantMenu() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { data: dishes, isLoading } = useListDishes({ search, category });
  const toggle = useToggleDishAvailability();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Menu</h1>
          <p className="text-muted-foreground mt-1">Gérez vos plats, prix et disponibilité.</p>
        </div>
        <Button className="rounded-xl" onClick={() => toast.info("Création de plat — bientôt disponible")}>
          <Plus size={16} className="mr-2" /> Nouveau plat
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {c === "all" ? "Tout" : c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dishes?.map((d) => (
            <Card key={d.id} className={`overflow-hidden transition ${!d.available ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border text-3xl">
                    {d.emoji}
                  </div>
                  <Switch
                    checked={d.available}
                    onCheckedChange={() => {
                      toggle.mutate({ id: d.id });
                    }}
                  />
                </div>
                <h3 className="mt-4 font-display font-semibold text-foreground">{d.name}</h3>
                {d.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-lg font-bold">{formatFCFA(d.price)}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} /> {d.prepMinutes} min
                  </span>
                </div>
                <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {d.category}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
