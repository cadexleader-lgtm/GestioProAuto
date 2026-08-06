import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Car, Fuel, Gauge, KeyRound, ShoppingCart,
  Wrench, Pencil, Eye, MoreVertical, Package, CheckCircle2, TrendingUp,
} from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { vehicleCost } from "@/lib/demo-data";
import { useCollection } from "@/lib/demo-store";
import { VehicleDialog } from "@/components/forms/SectorDialogs";
import {
  RentVehicleDialog, SellVehicleDialog, MaintenanceVehicleDialog,
} from "@/components/vehicles/VehicleActionsDialogs";
import { VehicleDetailSheet } from "@/components/vehicles/VehicleDetailSheet";
import type { Vehicle } from "@/lib/demo-data";

const STATUS: Record<Vehicle["status"], { label: string; cls: string; dot: string }> = {
  available:   { label: "Disponible",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  sold:        { label: "Vendu",       cls: "bg-slate-200 text-slate-700 border-slate-300",        dot: "bg-slate-500" },
  rented:      { label: "Loué",        cls: "bg-indigo-100 text-indigo-700 border-indigo-200",    dot: "bg-indigo-500" },
  maintenance: { label: "Maintenance", cls: "bg-amber-100 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
};

type Filter = "all" | Vehicle["status"];

export function VehiculesList() {
  const vehicles = useCollection("vehicles");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [editFor, setEditFor] = useState<Vehicle | null>(null);
  const [rentFor, setRentFor] = useState<Vehicle | null>(null);
  const [sellFor, setSellFor] = useState<Vehicle | null>(null);
  const [maintFor, setMaintFor] = useState<Vehicle | null>(null);
  const [viewFor, setViewFor] = useState<Vehicle | null>(null);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
    const rented = vehicles.filter((v) => v.status === "rented").length;
    const sold = vehicles.filter((v) => v.status === "sold").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;
    const inStock = vehicles.filter((v) => v.status !== "sold");
    // Valeur de stock = prix de revient complet (achat + import + douane + réparations + entretien)
    const stockValue = inStock.reduce((s, v) => s + vehicleCost(v), 0);
    const resaleValue = inStock.reduce((s, v) => s + (v.sellingPrice || 0), 0);
    return { total, available, rented, sold, maintenance, stockValue, resaleValue };
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      // Le parc actif n'affiche pas les véhicules vendus : ils partent en historique.
      if (filter === "all" && v.status === "sold") return false;
      if (filter !== "all" && v.status !== filter) return false;
      if (!q) return true;
      return `${v.brand} ${v.model} ${v.plate} ${v.vin} ${v.color}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [vehicles, q, filter]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Parc véhicules</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pilotage complet : stock, location, vente, crédit, maintenance.
            {stats.sold > 0 && <> Les véhicules vendus sont archivés dans <button onClick={() => setFilter("sold")} className="text-primary font-semibold underline">l'historique</button>.</>}
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="shadow-lg shadow-primary/20"><Plus size={16} /> Ajouter</Button>
      </div>

      {/* KPI dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={<Package className="text-slate-600" size={18} />} label="Total" value={stats.total} active={filter === "all"} onClick={() => setFilter("all")} />
        <Kpi icon={<CheckCircle2 className="text-emerald-600" size={18} />} label="Disponibles" value={stats.available} active={filter === "available"} onClick={() => setFilter("available")} />
        <Kpi icon={<KeyRound className="text-indigo-600" size={18} />} label="Loués" value={stats.rented} active={filter === "rented"} onClick={() => setFilter("rented")} />
        <Kpi icon={<ShoppingCart className="text-slate-600" size={18} />} label="Vendus (hist.)" value={stats.sold} active={filter === "sold"} onClick={() => setFilter("sold")} />
        <Kpi icon={<Wrench className="text-amber-600" size={18} />} label="Maintenance" value={stats.maintenance} active={filter === "maintenance"} onClick={() => setFilter("maintenance")} />
        <Kpi
          icon={<TrendingUp className="text-violet-600" size={18} />}
          label="Valeur stock"
          valueText={formatFCFA(stats.stockValue)}
          tone="violet"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Marque, modèle, plaque, VIN..." className="pl-9" />
        </div>
      </div>

      {/* Cards grid — mobile: 2 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((v) => {
          const st = STATUS[v.status];
          return (
            <Card
              key={v.id}
              className="group overflow-hidden rounded-2xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setViewFor(v)}
            >
              <div className="relative h-28 sm:h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                {v.image ? (
                  <img src={v.image} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="text-5xl sm:text-7xl">{v.photo}</span>
                )}
                <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${st.cls} border backdrop-blur`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-white/80 hover:bg-white backdrop-blur shadow">
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setViewFor(v)}><Eye size={14} className="mr-2" /> Voir fiche</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {v.status === "available" && (
                        <>
                          <DropdownMenuItem onClick={() => setRentFor(v)}><KeyRound size={14} className="mr-2" /> Louer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSellFor(v)}><ShoppingCart size={14} className="mr-2" /> Vendre</DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setMaintFor(v)} disabled={v.status === "sold"}><Wrench size={14} className="mr-2" /> Maintenance</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditFor(v)}><Pencil size={14} className="mr-2" /> Modifier</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <CardContent className="p-3 sm:p-4 space-y-2">
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base leading-tight line-clamp-1">{v.brand} {v.model}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{v.year} · {v.color} · {v.plate}</p>
                </div>

                <div className="hidden sm:grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Gauge size={11} /> {(v.mileageKm / 1000).toFixed(0)}k km</span>
                  <span className="inline-flex items-center gap-1"><Fuel size={11} /> {v.fuel}</span>
                </div>

                <div className="pt-2 border-t flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Prix</p>
                    <p className="font-display font-bold text-primary text-sm sm:text-base truncate">{formatFCFA(v.sellingPrice)}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] hidden sm:inline-flex">
                    Coût {formatFCFA(vehicleCost(v))}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Car size={48} className="mx-auto opacity-30 mb-3" />
            <p>Aucun véhicule trouvé</p>
            {filter === "all" && stats.sold > 0 && (
              <button onClick={() => setFilter("sold")} className="mt-2 text-sm text-primary font-semibold underline">
                Voir les {stats.sold} véhicule(s) vendu(s)
              </button>
            )}
          </div>
        )}
      </div>

      <VehicleDialog open={openAdd} onOpenChange={setOpenAdd} />
      <VehicleDialog vehicle={editFor} open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)} />
      <RentVehicleDialog vehicle={rentFor} open={!!rentFor} onOpenChange={(o) => !o && setRentFor(null)} />
      <SellVehicleDialog vehicle={sellFor} open={!!sellFor} onOpenChange={(o) => !o && setSellFor(null)} />
      <MaintenanceVehicleDialog vehicle={maintFor} open={!!maintFor} onOpenChange={(o) => !o && setMaintFor(null)} />
      <VehicleDetailSheet vehicle={viewFor} open={!!viewFor} onOpenChange={(o) => !o && setViewFor(null)} />
    </div>
  );
}

function Kpi({
  icon, label, value, valueText, active, onClick, tone,
}: {
  icon: React.ReactNode; label: string;
  value?: number; valueText?: string;
  active?: boolean; onClick?: () => void;
  tone?: "violet";
}) {
  const base = "rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 backdrop-blur";
  const palette = tone === "violet"
    ? "bg-gradient-to-br from-violet-50 to-violet-100/60 border-violet-200/60"
    : active
      ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
      : "bg-white/70 dark:bg-slate-900/60 border-slate-200/60 hover:bg-white";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`${base} ${palette} hover:-translate-y-0.5 w-full`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">{icon}</div>
        <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-muted-foreground truncate">{label}</p>
      </div>
      <p className="font-display font-bold text-lg sm:text-xl tabular-nums truncate">
        {valueText ?? value}
      </p>
    </Comp>
  );
}
