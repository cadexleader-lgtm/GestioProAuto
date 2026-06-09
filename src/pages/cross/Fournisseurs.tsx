import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollection } from "@/lib/demo-store";
import { formatFCFA } from "@/lib/format";
import { Truck, Plus, Mail, Phone, MapPin, AlertCircle } from "lucide-react";
import { SupplierDialog } from "@/components/forms/SupplierDialog";

export function Fournisseurs() {
  const suppliers = useCollection("suppliers");
  const [open, setOpen] = useState(false);
  const totalDebt = suppliers.reduce((s, x) => s + x.outstandingDebt, 0);
  const totalPurchased = suppliers.reduce((s, x) => s + x.totalPurchases, 0);
  const ordersInProgress = suppliers.reduce((s, x) => s + x.ordersInProgress, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground mt-1">Gérez vos achats, dettes et commandes en cours.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> Ajouter un fournisseur</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Fournisseurs"   value={suppliers.length.toString()}   icon={<Truck size={18} />} tone="blue" />
        <Stat label="Montant acheté" value={formatFCFA(totalPurchased)}    icon={<Truck size={18} />} tone="indigo" />
        <Stat label="Dettes en cours" value={formatFCFA(totalDebt)}        icon={<AlertCircle size={18} />} tone="rose" />
        <Stat label="Cmdes en cours" value={ordersInProgress.toString()}   icon={<Truck size={18} />} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suppliers.map(s => (
          <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.company}</p>
                </div>
                {s.outstandingDebt > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 inline-flex items-center gap-1">
                    <AlertCircle size={10} /> Dette
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Phone size={12} /> {s.phone}</span>
                <span className="inline-flex items-center gap-1.5 truncate"><Mail size={12} /> {s.email}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {s.city}, {s.country}</span>
                <span className="inline-flex items-center gap-1.5">👤 {s.contact}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Acheté</p>
                  <p className="font-semibold mt-0.5">{formatFCFA(s.totalPurchases)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Dette</p>
                  <p className={`font-semibold mt-0.5 ${s.outstandingDebt > 0 ? "text-rose-700" : ""}`}>{formatFCFA(s.outstandingDebt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Cmdes</p>
                  <p className="font-semibold mt-0.5">{s.ordersInProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SupplierDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "blue"|"indigo"|"rose"|"amber" }) {
  const tones = {
    blue: "from-white to-blue-50 border-blue-200/70 text-blue-700",
    indigo: "from-white to-indigo-50 border-indigo-200/70 text-indigo-700",
    rose: "from-white to-rose-50 border-rose-200/70 text-rose-700",
    amber: "from-white to-amber-50 border-amber-200/70 text-amber-700",
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          {icon}
        </div>
        <p className="font-display font-bold text-lg mt-2 text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
