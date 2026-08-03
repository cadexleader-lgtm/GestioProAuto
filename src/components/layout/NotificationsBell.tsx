import { Bell, CheckCheck, Trash2, ShoppingCart, CreditCard, Car, Package, Wrench, Receipt, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  info: "bg-slate-100 text-slate-600",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

function ago(iso: string) {
  const d = Math.max(0, Date.now() - +new Date(iso));
  const m = Math.floor(d / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotificationsBell() {
  const items = useNotifications();
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover onOpenChange={(o) => { if (!o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          title="Notifications"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div>
            <p className="text-sm font-display font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">{items.length} évènement(s) synchronisé(s)</p>
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

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground px-6">
              Aucune notification pour le moment.<br />
              <span className="text-xs">Ventes, crédits, retours et stock apparaîtront ici.</span>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.key} className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-primary/5"}`}>
                  <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${TONES[n.severity]}`}>
                    {ICONS[n.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.description && <p className="text-xs text-muted-foreground truncate">{n.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ago(n.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
