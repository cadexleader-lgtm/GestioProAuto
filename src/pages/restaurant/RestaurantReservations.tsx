import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollection, db } from "@/lib/demo-store";
import { Plus, Phone, Users, Calendar, Clock, Check, X } from "lucide-react";
import { ReservationDialog } from "@/components/forms/SectorDialogs";
import { toast } from "sonner";

const STATUS: Record<string,{label:string;cls:string}> = {
  pending:{label:"En attente",cls:"bg-amber-50 text-amber-700"},
  confirmed:{label:"Confirmée",cls:"bg-emerald-50 text-emerald-700"},
  seated:{label:"Installée",cls:"bg-blue-50 text-blue-700"},
  cancelled:{label:"Annulée",cls:"bg-slate-100 text-slate-500"},
  noshow:{label:"No-show",cls:"bg-rose-50 text-rose-700"},
};

export function RestaurantReservations() {
  const reservations = useCollection("reservations");
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const todayRes = reservations.filter(r=>r.date===today);
  const upcoming = reservations.filter(r=>r.date>today);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Réservations</h1>
          <p className="text-muted-foreground mt-1">Plan de salle, calendrier, confirmations WhatsApp.</p>
        </div>
        <Button onClick={()=>setOpen(true)}><Plus size={16}/> Nouvelle réservation</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-200/70"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Aujourd'hui</p><p className="font-display font-bold text-2xl mt-1">{todayRes.length}</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-white to-indigo-50 border-indigo-200/70"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Couverts ce soir</p><p className="font-display font-bold text-2xl mt-1">{todayRes.reduce((s,r)=>s+r.guests,0)}</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-200/70"><CardContent className="p-5"><p className="text-xs text-muted-foreground">À venir</p><p className="font-display font-bold text-2xl mt-1">{upcoming.length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <h3 className="font-display font-semibold p-6 pb-4">Toutes les réservations</h3>
        <div className="border-t divide-y">
          {reservations.map(r => { const s = STATUS[r.status]; return (
            <div key={r.id} className="p-5 hover:bg-muted/30 flex flex-wrap items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center text-xs font-bold">
                <span className="text-[10px]">T</span><span className="text-base">{r.tableNumber}</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold">{r.customerName}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Phone size={11}/>{r.phone}</span>
                  <span className="inline-flex items-center gap-1"><Calendar size={11}/>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={11}/>{r.time}</span>
                  <span className="inline-flex items-center gap-1"><Users size={11}/>{r.guests} couverts</span>
                </div>
                {r.note && <p className="text-xs italic text-muted-foreground mt-1">"{r.note}"</p>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${s.cls}`}>{s.label}</span>
              <div className="flex gap-1">
                {r.status==="pending" && <Button size="sm" variant="outline" onClick={()=>{db.update("reservations",r.id,{status:"confirmed"});toast.success("Confirmée");}}><Check size={14}/></Button>}
                {r.status!=="cancelled" && <Button size="sm" variant="ghost" onClick={()=>{db.update("reservations",r.id,{status:"cancelled"});toast.success("Annulée");}}><X size={14}/></Button>}
              </div>
            </div>
          );})}
          {reservations.length===0 && <div className="p-10 text-center text-muted-foreground">Aucune réservation pour l'instant.</div>}
        </div>
      </CardContent></Card>

      <ReservationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
