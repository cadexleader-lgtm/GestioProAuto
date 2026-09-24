import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useRole, can, ROLES, type Role } from "@/lib/roles";
import { createTeamMember } from "@/lib/api/team.functions";
import { createEmployee } from "@/lib/demo-store";

interface Member {
  userId: string;
  role: Role;
  fullName: string | null;
}

const ROLE_LABEL: Record<Role, string> = { patron: "Patron", manager: "Manager", terrain: "Terrain" };

export function TeamCard() {
  const { company } = useTenant();
  const role = useRole();
  const canManageTeam = can(role, "manage.team");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ fullName: string; email: string; role: "manager" | "terrain"; position: string; department: string; phone: string; salary: number }>({
    fullName: "", email: "", role: "terrain", position: "", department: "Ventes", phone: "", salary: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = async () => {
    if (!company?.id) return;
    setLoading(true);
    const sb = supabase as any;
    const { data: rows, error } = await sb
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });

    if (error || !rows) {
      setLoading(false);
      return;
    }

    const userIds = rows.map((r: any) => r.user_id);
    const { data: profileRows } = userIds.length
      ? await sb.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const nameById = new Map((profileRows ?? []).map((p: any) => [p.id, p.full_name]));

    setMembers(rows.map((m: any) => ({
      userId: m.user_id,
      role: m.role,
      fullName: nameById.get(m.user_id) ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { void loadMembers(); }, [company?.id]);

  const openAdd = () => {
    setForm({ fullName: "", email: "", role: "terrain", position: "", department: "Ventes", phone: "", salary: 0 });
    setLastCreated(null);
    setCopied(false);
    setOpen(true);
  };

  const submit = async () => {
    if (!company?.id) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Nom et email requis");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await createTeamMember({
        data: { companyId: company.id, email: form.email.trim(), fullName: form.fullName.trim(), role: form.role },
      });

      // Cree aussi la fiche employe (poste, salaire, bulletins) et la relie au
      // compte de connexion qu'on vient de creer, pour que la personne puisse
      // retrouver sa propre fiche (vue restreinte "terrain" sur Personnel.tsx).
      const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
      try {
        await createEmployee({
          employeeId: crypto.randomUUID(),
          firstName: firstName || form.fullName.trim(),
          lastName: rest.join(" ") || "-",
          position: form.position || (form.role === "manager" ? "Manager" : "Agent de terrain"),
          department: form.department,
          phone: form.phone,
          email: form.email.trim(),
          hiredAt: new Date().toISOString().slice(0, 10),
          salary: form.salary,
          status: "present",
          userId: result.userId,
        });
      } catch (empError) {
        toast.error("Compte créé, mais la fiche employé n'a pas pu être créée — ajoutez-la manuellement dans Personnel.", {
          description: empError instanceof Error ? empError.message : undefined,
        });
      }

      setLastCreated({ email: form.email.trim(), tempPassword: result.tempPassword });
      toast.success("Membre ajouté");
      await loadMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le membre n'a pas pu être ajouté.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!lastCreated) return;
    try {
      await navigator.clipboard.writeText(lastCreated.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible, sélectionnez le mot de passe manuellement.");
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users size={18} /> Équipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManageTeam && (
          <p className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            Ajouter un membre est réservé au rôle Patron.
          </p>
        )}
        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && members.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun membre pour l'instant.</p>
          )}
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">{m.fullName || "—"}</span>
              <Badge variant="outline" className="rounded-lg text-xs">{ROLE_LABEL[m.role]}</Badge>
            </div>
          ))}
        </div>
        {canManageTeam && (
          <Button type="button" variant="outline" className="rounded-xl gap-1.5" onClick={openAdd}>
            <Plus size={16} /> Ajouter un membre
          </Button>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau membre</DialogTitle>
            <DialogDescription>
              Le compte est créé immédiatement avec un mot de passe temporaire — communiquez-le
              vous-même à la personne, elle pourra le changer via "Mot de passe oublié".
            </DialogDescription>
          </DialogHeader>

          {!lastCreated ? (
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label>Nom complet *</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "manager" | "terrain" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r.id !== "patron").map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Poste</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Ex. Mécanicien" />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Salaire mensuel (FCFA)</Label>
                <Input type="number" value={form.salary || 0} onChange={(e) => setForm({ ...form, salary: +e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Une fiche employé est créée en même temps, avec ces informations — modifiable ensuite dans Personnel.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
              <p className="text-sm text-emerald-900">
                Compte créé pour <strong>{lastCreated.email}</strong>. Communiquez ce mot de passe temporaire :
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white border px-3 py-2 text-sm font-mono">{lastCreated.tempPassword}</code>
                <Button type="button" size="icon" variant="outline" onClick={() => void copyPassword()}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="text-xs text-emerald-800/80">Ce mot de passe ne sera plus affiché après fermeture.</p>
            </div>
          )}

          <DialogFooter className="mt-4">
            {!lastCreated ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
                <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Création..." : "Créer le compte"}</Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>Terminé</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
