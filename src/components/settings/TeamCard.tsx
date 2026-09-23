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
  const [form, setForm] = useState<{ fullName: string; email: string; role: "manager" | "terrain" }>({ fullName: "", email: "", role: "terrain" });
  const [submitting, setSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = async () => {
    if (!company?.id) return;
    setLoading(true);
    const sb = supabase as any;
    const { data, error } = await sb
      .from("company_members")
      .select("user_id, role, profiles(full_name)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });
    if (!error) {
      setMembers((data ?? []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        fullName: m.profiles?.full_name ?? null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { void loadMembers(); }, [company?.id]);

  const openAdd = () => {
    setForm({ fullName: "", email: "", role: "terrain" });
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
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
        <Button type="button" variant="outline" className="rounded-xl gap-1.5" disabled={!canManageTeam} onClick={openAdd}>
          <Plus size={16} /> Ajouter un membre
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
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
            </div>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
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
