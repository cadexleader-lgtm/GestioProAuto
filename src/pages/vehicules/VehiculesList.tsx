import { useState, useMemo, useEffect } from "react";
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
  RefreshCw, Send, Images, Video,
} from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";
import { vehicleCost } from "@/lib/demo-data";
import { db, useCollection, uploadVehiclePhoto } from "@/lib/demo-store";
import { VehicleDialog, VEHICLE_DRAFT_KEY } from "@/components/forms/SectorDialogs";
import { loadDraft } from "@/lib/form-draft";
import {
  RentVehicleDialog, MaintenanceVehicleDialog,
} from "@/components/vehicles/VehicleActionsDialogs";
import { SaleWorkflowDialog } from "@/components/vehicles/SaleWorkflowDialog";
import { VehicleDetailSheet } from "@/components/vehicles/VehicleDetailSheet";
import { VehicleShareDialog } from "@/components/vehicles/VehicleShareDialog";
import type { Vehicle } from "@/lib/demo-data";
import { useRole, can } from "@/lib/roles";
import { VEHICLE_STATUS } from "@/lib/vehicle-status";

type Filter = "all" | Vehicle["status"];

export function VehiculesList() {
  const role = useRole();
  const canSell = can(role, "create.sale");
  const canRent = can(role, "manage.rental");
  const canEditVehicle = can(role, "edit.vehicle");
  const canCreateVehicle = can(role, "create.vehicle");
  const canViewCost = can(role, "view.vehicleCost");
  const vehicles = useCollection("vehicles");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openAdd, setOpenAdd] = useState(false);

  // Si la page (et donc le dialogue d'ajout) a ete rechargee malgre elle
  // pendant une saisie en cours — cas frequent sur mobile en manque de
  // memoire au moment d'ouvrir le selecteur de fichiers — le brouillon
  // survit en localStorage mais le dialogue, lui, se referme forcement
  // (son etat React repart de zero). On le rouvre automatiquement au lieu
  // de laisser l'utilisateur redecouvrir son brouillon par hasard.
  useEffect(() => {
    if (loadDraft(VEHICLE_DRAFT_KEY)) setOpenAdd(true);
  }, []);
  const [editFor, setEditFor] = useState<Vehicle | null>(null);
  const [rentFor, setRentFor] = useState<Vehicle | null>(null);
  const [saleVehicle, setSaleVehicle] = useState<Vehicle | null>(null);
  const [maintFor, setMaintFor] = useState<Vehicle | null>(null);
  const [viewFor, setViewFor] = useState<Vehicle | null>(null);
  const [shareFor, setShareFor] = useState<Vehicle | null>(null);
  const [migratingPhotos, setMigratingPhotos] = useState(false);

  const legacyPhotoCount = useMemo(
    () => vehicles.filter((v) => v.image?.startsWith("data:")).length,
    [vehicles],
  );

  const migrateLegacyPhotos = async () => {
    if (migratingPhotos || legacyPhotoCount === 0) return;
    setMigratingPhotos(true);
    let migrated = 0;
    let failed = 0;
    try {
      for (const v of vehicles) {
        if (!v.image?.startsWith("data:")) continue;
        try {
          const blob = await (await fetch(v.image)).blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const file = new File([blob], `cover.${ext}`, { type: blob.type });
          const url = await uploadVehiclePhoto({ vehicleId: v.id, file });
          db.update("vehicles", v.id, { image: url } as any);
          migrated += 1;
        } catch (error) {
          failed += 1;
          console.error("[gestiopro] legacy vehicle photo migration failed", error);
        }
      }
      if (migrated > 0) toast.success(`${migrated} photo(s) migrée(s) vers le stockage.`);
      if (failed > 0) toast.error(`${failed} photo(s) n'ont pas pu être migrées et restent inchangées.`);
    } finally {
      setMigratingPhotos(false);
    }
  };

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
        <div className="flex flex-wrap gap-2">
          {legacyPhotoCount > 0 && (
            <Button
              variant="outline"
              className="rounded-xl gap-1.5 border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50"
              disabled={migratingPhotos}
              onClick={() => void migrateLegacyPhotos()}
            >
              <RefreshCw size={15} />
              {migratingPhotos ? "Migration..." : `Migrer photos (${legacyPhotoCount})`}
            </Button>
          )}
          {canCreateVehicle && (
            <Button onClick={() => setOpenAdd(true)} className="shadow-lg shadow-primary/20"><Plus size={16} /> Ajouter</Button>
          )}
        </div>
      </div>

      {/* KPI dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={<Package className="text-slate-600" size={18} />} label="Total" value={stats.total} active={filter === "all"} onClick={() => setFilter("all")} />
        <Kpi icon={<CheckCircle2 className="text-emerald-600" size={18} />} label="Disponibles" value={stats.available} active={filter === "available"} onClick={() => setFilter("available")} />
        <Kpi icon={<KeyRound className="text-indigo-600" size={18} />} label="Loués" value={stats.rented} active={filter === "rented"} onClick={() => setFilter("rented")} />
        <Kpi icon={<ShoppingCart className="text-slate-600" size={18} />} label="Vendus (hist.)" value={stats.sold} active={filter === "sold"} onClick={() => setFilter("sold")} />
        <Kpi icon={<Wrench className="text-amber-600" size={18} />} label="Maintenance" value={stats.maintenance} active={filter === "maintenance"} onClick={() => setFilter("maintenance")} />
        {canViewCost && (
          <Kpi
            icon={<TrendingUp className="text-violet-600" size={18} />}
            label="Valeur stock (revient)"
            valueText={formatFCFA(stats.stockValue)}
            hint={`Revente est. ${formatFCFA(stats.resaleValue)} · Marge ${formatFCFA(stats.resaleValue - stats.stockValue)}`}
            tone="violet"
          />
        )}
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
          const st = VEHICLE_STATUS[v.status];
          const canRentThis = v.status === "available" && canRent;
          const canSellThis = v.status === "available" && canSell;
          const canMaintainThis = v.status !== "sold" && v.status !== "maintenance";
          return (
            <Card
              key={v.id}
              className="group overflow-hidden rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              onClick={() => setViewFor(v)}
            >
              <div className="relative h-28 sm:h-36 bg-muted flex items-center justify-center overflow-hidden">
                {v.image ? (
                  <img src={v.image} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="text-5xl sm:text-7xl">{v.photo}</span>
                )}
                <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${st.badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                  {st.label}
                </span>
                {((v.photos?.length ?? 0) > 0 || v.video) && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black/55 text-white">
                    {(v.photos?.length ?? 0) > 0 && <><Images size={11} /> {(v.photos?.length ?? 0) + 1}</>}
                    {v.video && <Video size={11} className={(v.photos?.length ?? 0) > 0 ? "ml-1" : ""} />}
                  </span>
                )}
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-white/90 hover:bg-white shadow">
                        <MoreVertical size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setViewFor(v)}><Eye size={14} className="mr-2" /> Voir fiche</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {canRentThis && <DropdownMenuItem onClick={() => setRentFor(v)}><KeyRound size={14} className="mr-2" /> Louer</DropdownMenuItem>}
                      {canSellThis && <DropdownMenuItem onClick={() => setSaleVehicle(v)}><ShoppingCart size={14} className="mr-2" /> Vendre</DropdownMenuItem>}
                      {canMaintainThis && <DropdownMenuItem onClick={() => setMaintFor(v)}><Wrench size={14} className="mr-2" /> Envoyer en maintenance</DropdownMenuItem>}
                      {canEditVehicle && <DropdownMenuItem onClick={() => setEditFor(v)}><Pencil size={14} className="mr-2" /> Modifier</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShareFor(v)}><Send size={14} className="mr-2" /> Partager avec un client</DropdownMenuItem>
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
                  {canViewCost && (
                    <Badge variant="secondary" className="text-[9px] hidden sm:inline-flex">
                      Coût {formatFCFA(vehicleCost(v))}
                    </Badge>
                  )}
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
      <SaleWorkflowDialog
        open={!!saleVehicle}
        initialVehicleId={saleVehicle?.id}
        onOpenChange={(o) => !o && setSaleVehicle(null)}
      />
      <MaintenanceVehicleDialog vehicle={maintFor} open={!!maintFor} onOpenChange={(o) => !o && setMaintFor(null)} />
      <VehicleDetailSheet
        vehicle={viewFor}
        open={!!viewFor}
        onOpenChange={(o) => !o && setViewFor(null)}
        onRent={setRentFor}
        onSell={setSaleVehicle}
        onMaintenance={setMaintFor}
        onEdit={setEditFor}
        onShare={setShareFor}
      />
      <VehicleShareDialog vehicle={shareFor} open={!!shareFor} onOpenChange={(o) => !o && setShareFor(null)} />
    </div>
  );
}

function Kpi({
  icon, label, value, valueText, active, onClick, tone, hint,
}: {
  icon: React.ReactNode; label: string;
  value?: number; valueText?: string; hint?: string;
  active?: boolean; onClick?: () => void;
  tone?: "violet";
}) {
  const base = "rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 shadow-sm";
  const palette = tone === "violet"
    ? "bg-violet-50/60 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/40"
    : active
      ? "bg-primary/10 border-primary/40"
      : "bg-card border-border hover:bg-muted/40";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`${base} ${palette} w-full`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center shadow-sm shrink-0">{icon}</div>
        <p className="min-w-0 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-muted-foreground truncate">{label}</p>
      </div>
      <p className="font-display font-bold text-lg sm:text-xl tabular-nums truncate">
        {valueText ?? value}
      </p>
      {hint && <p className="mt-1 text-[10px] leading-tight text-muted-foreground line-clamp-2">{hint}</p>}
    </Comp>
  );
}
