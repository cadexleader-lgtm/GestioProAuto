import { useMemo, useState } from "react";
import { useCollection, vehicleProfitability } from "@/lib/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatFCFA } from "@/lib/format";
import {
  Users, Search, Car, CreditCard, KeyRound, Phone, MapPin,
  AlertTriangle, ShieldAlert, Wrench, TrendingUp, FileText,
} from "lucide-react";

type ClientAgg = {
  name: string;
  phone?: string;
  address?: string;
  cin?: string;
  totalSpent: number;
  vehiclesOwned: string[];
  vehiclesRented: string[];
  activeCredit?: {
    id: string; remaining: number; nextDueDate: string; status: "ok" | "late";
    paidMonths: number; totalMonths: number;
  };
  reminders: { label: string; date: string; kind: "insurance" | "tech" | "credit" }[];
};

export function VehiculesClients() {
  const vehicles = useCollection("vehicles");
  const sales = useCollection("vehicleSales");
  const credits = useCollection("vehicleCredits");
  const payments = useCollection("vehiclePayments");
  const rentals = useCollection("rentals");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const clients = useMemo<ClientAgg[]>(() => {
    const map = new Map<string, ClientAgg>();
    const get = (name: string): ClientAgg => {
      let c = map.get(name);
      if (!c) {
        c = { name, totalSpent: 0, vehiclesOwned: [], vehiclesRented: [], reminders: [] };
        map.set(name, c);
      }
      return c;
    };

    sales.forEach((s) => {
      const c = get(s.customer);
      c.phone ||= s.phone;
      c.address ||= s.address;
      c.cin ||= s.cin;
      c.totalSpent += s.amount;
      if (!c.vehiclesOwned.includes(s.vehicleId)) c.vehiclesOwned.push(s.vehicleId);
      if (s.reminders?.insuranceExpiry)
        c.reminders.push({ kind: "insurance", label: "Assurance", date: s.reminders.insuranceExpiry });
      if (s.reminders?.techControlExpiry)
        c.reminders.push({ kind: "tech", label: "Contrôle technique", date: s.reminders.techControlExpiry });
    });

    credits.forEach((cr) => {
      const c = get(cr.customer);
      const paid = cr.downPayment + payments.filter((p) => p.creditId === cr.id).reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, cr.total - paid);
      if (remaining > 0) {
        c.activeCredit = {
          id: cr.id,
          remaining,
          nextDueDate: cr.nextDueDate,
          status: cr.status,
          paidMonths: cr.paidMonths,
          totalMonths: cr.totalMonths,
        };
        c.reminders.push({ kind: "credit", label: `Échéance crédit`, date: cr.nextDueDate });
      }
    });

    rentals.forEach((r) => {
      const c = get(r.customer);
      c.phone ||= r.phone;
      if (!c.vehiclesRented.includes(r.vehicleId)) c.vehiclesRented.push(r.vehicleId);
    });

    const arr = Array.from(map.values());
    const ql = q.trim().toLowerCase();
    return (ql ? arr.filter((c) => c.name.toLowerCase().includes(ql) || (c.phone || "").includes(ql)) : arr)
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales, credits, payments, rentals, q]);

  const selectedClient = clients.find((c) => c.name === selected) || null;
  const vById = (id: string) => vehicles.find((v) => v.id === id);

  const today = Date.now();
  const soonMs = 30 * 86400000;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Clients auto</h1>
        <p className="text-muted-foreground mt-1">
          Fiche complète, historique d'achats/locations et rappels d'expiration.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Clients" value={clients.length} icon={<Users size={18} />} color="blue" />
        <KPI
          label="Crédits en cours"
          value={clients.filter((c) => c.activeCredit).length}
          icon={<CreditCard size={18} />}
          color="amber"
        />
        <KPI
          label="Rappels < 30j"
          value={clients.reduce(
            (s, c) =>
              s +
              c.reminders.filter((r) => {
                const t = +new Date(r.date);
                return t - today > 0 && t - today < soonMs;
              }).length,
            0,
          )}
          icon={<AlertTriangle size={18} />}
          color="rose"
        />
        <KPI
          label="CA cumulé"
          value={formatFCFA(clients.reduce((s, c) => s + c.totalSpent, 0))}
          icon={<TrendingUp size={18} />}
          color="emerald"
        />
      </div>

      <div className="bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client, téléphone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {clients.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Aucun client enregistré pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const soon = c.reminders.filter((r) => {
              const t = +new Date(r.date);
              return t - today < soonMs;
            });
            return (
              <Card
                key={c.name}
                onClick={() => setSelected(c.name)}
                className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all rounded-2xl"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone size={12} /> {c.phone}
                        </p>
                      )}
                    </div>
                    {c.activeCredit && (
                      <Badge variant={c.activeCredit.status === "late" ? "destructive" : "secondary"}>
                        Crédit {c.activeCredit.status === "late" ? "en retard" : "actif"}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 text-center gap-1 pt-2 border-t">
                    <Mini icon={<Car size={12} />} value={c.vehiclesOwned.length} label="Achetés" />
                    <Mini icon={<KeyRound size={12} />} value={c.vehiclesRented.length} label="Loués" />
                    <Mini
                      icon={<AlertTriangle size={12} />}
                      value={soon.length}
                      label="Rappels"
                      accent={soon.length > 0}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Total dépensé : <span className="font-bold text-foreground">{formatFCFA(c.totalSpent)}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selectedClient} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedClient.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                <Card className="rounded-xl">
                  <CardContent className="p-4 space-y-2 text-sm">
                    {selectedClient.phone && (
                      <p className="flex items-center gap-2">
                        <Phone size={14} className="text-muted-foreground" /> {selectedClient.phone}
                      </p>
                    )}
                    {selectedClient.address && (
                      <p className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground" /> {selectedClient.address}
                      </p>
                    )}
                    {selectedClient.cin && (
                      <p className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" /> CIN : {selectedClient.cin}
                      </p>
                    )}
                    <p className="pt-1 border-t">
                      Total dépensé :{" "}
                      <span className="font-bold text-primary">{formatFCFA(selectedClient.totalSpent)}</span>
                    </p>
                  </CardContent>
                </Card>

                {selectedClient.activeCredit && (
                  <Card className="rounded-xl border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard size={16} /> Crédit en cours
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>
                        Reste dû :{" "}
                        <span className="font-bold text-amber-700">
                          {formatFCFA(selectedClient.activeCredit.remaining)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedClient.activeCredit.paidMonths}/{selectedClient.activeCredit.totalMonths} mensualités
                        payées — prochaine échéance :{" "}
                        {new Date(selectedClient.activeCredit.nextDueDate).toLocaleDateString("fr-FR")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Section title="Véhicules achetés" icon={<Car size={16} />}>
                  {selectedClient.vehiclesOwned.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun</p>
                  ) : (
                    selectedClient.vehiclesOwned.map((id) => {
                      const v = vById(id);
                      if (!v) return null;
                      const prof = vehicleProfitability(id);
                      return (
                        <div key={id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <span className="text-2xl">{v.photo}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {v.brand} {v.model}
                            </p>
                            <p className="text-xs text-muted-foreground">{v.plate}</p>
                          </div>
                          {prof && (
                            <span className="text-xs font-semibold text-emerald-700">{formatFCFA(v.sellingPrice)}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </Section>

                <Section title="Locations" icon={<KeyRound size={16} />}>
                  {selectedClient.vehiclesRented.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune</p>
                  ) : (
                    selectedClient.vehiclesRented.map((id) => {
                      const v = vById(id);
                      if (!v) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <span className="text-xl">{v.photo}</span>
                          <p className="text-sm font-medium">
                            {v.brand} {v.model} · {v.plate}
                          </p>
                        </div>
                      );
                    })
                  )}
                </Section>

                <Section title="Rappels & échéances" icon={<AlertTriangle size={16} />}>
                  {selectedClient.reminders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun</p>
                  ) : (
                    selectedClient.reminders
                      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
                      .map((r, i) => {
                        const days = Math.round((+new Date(r.date) - today) / 86400000);
                        const overdue = days < 0;
                        const soon = days >= 0 && days < 30;
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 py-2 border-b last:border-0 ${
                              overdue ? "text-rose-700" : soon ? "text-amber-700" : ""
                            }`}
                          >
                            {r.kind === "insurance" ? (
                              <ShieldAlert size={14} />
                            ) : r.kind === "tech" ? (
                              <Wrench size={14} />
                            ) : (
                              <CreditCard size={14} />
                            )}
                            <span className="text-sm flex-1">{r.label}</span>
                            <span className="text-xs">
                              {new Date(r.date).toLocaleDateString("fr-FR")}
                              {overdue
                                ? ` · en retard`
                                : soon
                                ? ` · dans ${days}j`
                                : ""}
                            </span>
                          </div>
                        );
                      })
                  )}
                </Section>

                {selectedClient.phone && (
                  <Button
                    className="w-full rounded-xl"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${selectedClient.phone!.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          `Bonjour ${selectedClient.name}, un rappel de votre concession auto.`,
                        )}`,
                        "_blank",
                      )
                    }
                  >
                    <Phone size={16} /> Contacter sur WhatsApp
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KPI({ label, value, icon, color }: { label: string; value: any; icon: React.ReactNode; color: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className={`w-9 h-9 rounded-xl ${map[color]} flex items-center justify-center mb-2`}>{icon}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display font-bold text-lg">{value}</p>
      </CardContent>
    </Card>
  );
}

function Mini({ icon, value, label, accent }: { icon: React.ReactNode; value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-xs font-bold flex items-center justify-center gap-1 ${accent ? "text-rose-600" : ""}`}>
        {icon} {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
        {icon} {title}
      </h3>
      <div className="rounded-xl border p-3">{children}</div>
    </div>
  );
}
