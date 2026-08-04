import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Trash2, ShoppingCart, CreditCard, Car, Package, Wrench, Receipt, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotifications, markAllRead, clearNotifications, type AppNotification } from "@/lib/notifications";

const ICONS: Record<AppNotification["kind"], React.ReactNode> = {
  sale: <ShoppingCart size={14} />,
  credit: <CreditCard size={14} />,
  rental: <Car size={14} />,
  stock: <Package size={14} />,
  maintenance: <Wrench size={14} />,
  expense: <Receipt size={14} />,
  info: <Info size={14} />,
};

const TONES: Record<AppNotification["severity"], string> = {
  info: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/15 text-emerald-600",
  warning: "bg-amber-500/15 text-amber-600",
  danger: "bg-destructive/15 text-destructive",
};

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "unread", label: "Non lues" },
  { id: "rental", label: "Location" },
  { id: "credit", label: "Crédit" },
  { id: "sale", label: "Ventes" },
] as const;

function ago(iso: string) {
  const d = Date.now() - +new Date(iso);
  if (d < 0) return new Date(iso).toLocaleDateString("fr-FR");
  const m = Math.floor(d / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotificationsBell() {
  const items = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const unread = items.filter((n) => !n.read).length;

  const shown = items.filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.read : n.kind === filter
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          title="Notifications"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute top-1 right-1.5 min-w-[17px] h-[17px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="w-[min(94vw,23rem)] p-0 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-4 pt-3 pb-2 border-b bg-muted/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-display font-semibold">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} non lue(s) · ` : ""}{items.length} évènement(s)
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Tout marquer comme lu" onClick={markAllRead}>
                <CheckCheck size={15} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Vider" onClick={clearNotifications}>
                <Trash2 size={15} />
              </Button>
            </div>
          </div>

          <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  filter === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[min(70vh,26rem)] overflow-y-auto overscroll-contain custom-scrollbar">
          {shown.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground px-6">
              Aucune notification ici.<br />
              <span className="text-xs">Ventes, locations, crédits, maintenance et stock s'afficheront ici.</span>
            </div>
          ) : (
            <ul className="divide-y">
              {shown.map((n) => (
                <li
                  key={n.key}
                  role={n.href ? "button" : undefined}
                  tabIndex={n.href ? 0 : undefined}
                  onClick={() => {
                    if (!n.href) return;
                    setOpen(false);
                    markAllRead();
                    navigate({ to: n.href });
                  }}
                  className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-primary/5"} ${n.href ? "cursor-pointer hover:bg-muted/60 transition-colors" : ""}`}
                >
                  <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${TONES[n.severity]}`}>
                    {ICONS[n.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug break-words">{n.title}</p>
                    {n.description && (
                      <p className="text-xs text-muted-foreground leading-snug break-words">{n.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ago(n.at)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
