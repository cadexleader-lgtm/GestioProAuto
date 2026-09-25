import { useSearch, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetCompany, useUpdateCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { db } from "@/lib/demo-store";
import { Database, Trash2, Shield, Volume2, Sun, Moon, Building2, Users, FileText, AlertTriangle } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ROLES, useRole, can } from "@/lib/roles";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { isSoundEnabled, setSoundEnabled } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { CompanyBrandingCard } from "@/components/settings/CompanyBrandingCard";
import { TeamCard } from "@/components/settings/TeamCard";
import { useState } from "react";
import { setFeatureFlags } from "@/lib/demo-store";
import { FEATURE_FLAGS, useFeatureFlags } from "@/lib/feature-flags";
import { SlidersHorizontal, CreditCard, Smartphone, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_NAMES, type PlanId, getCurrentPlan, setCurrentPlanStorage } from "@/lib/subscription";
import { relaunchDashboardTour } from "@/lib/onboarding";
import { PlayCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SectionId = "entreprise" | "marque" | "equipe" | "modules" | "abonnement" | "preferences" | "danger";

const SECTIONS: { id: SectionId; label: string; icon: typeof Building2 }[] = [
  { id: "entreprise", label: "Entreprise", icon: Building2 },
  { id: "marque", label: "Marque & documents", icon: FileText },
  { id: "equipe", label: "Équipe", icon: Users },
  { id: "modules", label: "Modules", icon: SlidersHorizontal },
  { id: "abonnement", label: "Abonnement", icon: CreditCard },
  { id: "preferences", label: "Préférences", icon: Sun },
  { id: "danger", label: "Zone de danger", icon: AlertTriangle },
];


const schema = z.object({
  name: z.string().min(1, "Requis"),
  ownerName: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  country: z.string().min(1, "Requis"),
  city: z.string().min(1, "Requis"),
  currency: z.string().min(1, "Requis"),
});

export function Settings() {
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useGetCompany();
  const updateCompany = useUpdateCompany();
  const role = useRole();
  const canWipe = can(role, "wipe.data");
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const search = useSearch({ from: "/app/parametres" });
  const [active, setActive] = useState<SectionId>(search.section ?? "entreprise");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", ownerName: "", email: "", phone: "", country: "Sénégal", city: "Dakar", currency: "FCFA",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        ownerName: company.ownerName,
        email: company.email,
        phone: company.phone || "",
        country: company.country,
        city: company.city,
        currency: company.currency,
      });
    }
  }, [company, form]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await updateCompany.mutateAsync({ data: { ...data, sectorId: "auto", subSectorId: "vehicules" } });
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <Skeleton className="h-64 rounded-2xl hidden lg:block" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (role === "terrain") {
    return <RestrictedAccess title="Paramètres" message="Accès aux paramètres restreint à votre rôle." />;
  }

  const roleInfo = ROLES.find((r) => r.id === role);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* En-tête du centre de paramètres */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 dark:to-muted/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary font-display text-lg font-bold uppercase">
            {(company?.name || "GP").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight truncate">{company?.name || "Paramètres"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Centre de gestion de votre espace GestioAuto</p>
          </div>
        </div>
        {roleInfo && (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            <Shield size={12} /> {roleInfo.label}
          </span>
        )}
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:items-start">
        {/* Navigation : pastilles horizontales sur mobile, rail vertical sur desktop */}
        <nav aria-label="Sections des paramètres">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => {
              const isActive = active === s.id;
              const isDanger = s.id === "danger";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap",
                    isActive && !isDanger && "border-primary bg-primary text-primary-foreground shadow-sm",
                    isActive && isDanger && "border-destructive bg-destructive text-destructive-foreground shadow-sm",
                    !isActive && !isDanger && "border-border bg-card text-muted-foreground hover:text-foreground",
                    !isActive && isDanger && "border-destructive/30 bg-card text-destructive/80 hover:text-destructive",
                  )}
                >
                  <s.icon size={14} /> {s.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex lg:flex-col lg:gap-1 lg:sticky lg:top-6">
            {SECTIONS.map((s, i) => {
              const isActive = active === s.id;
              const isDanger = s.id === "danger";
              const prevIsDanger = SECTIONS[i - 1]?.id === "danger";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-left transition",
                    isDanger && !prevIsDanger && "mt-3 border-t border-border pt-3.5",
                    isActive && !isDanger && "bg-primary/10 text-primary",
                    isActive && isDanger && "bg-destructive/10 text-destructive",
                    !isActive && !isDanger && "text-muted-foreground hover:bg-muted hover:text-foreground",
                    !isActive && isDanger && "text-destructive/70 hover:bg-destructive/5 hover:text-destructive",
                  )}
                >
                  <s.icon size={16} className="shrink-0" /> {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Contenu de la section active */}
        <div className="mt-5 lg:mt-0 min-w-0 space-y-6">
          {active === "entreprise" && (
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Profil de l'entreprise</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nom de l'entreprise</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name="ownerName" render={({ field }) => (
                        <FormItem><FormLabel>Nom du propriétaire</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel>Pays</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Sénégal">Sénégal</SelectItem>
                              <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                              <SelectItem value="Bénin">Bénin</SelectItem>
                              <SelectItem value="Togo">Togo</SelectItem>
                              <SelectItem value="Cameroun">Cameroun</SelectItem>
                              <SelectItem value="Mali">Mali</SelectItem>
                            </SelectContent>
                          </Select><FormMessage/>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                      )} />
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem><FormLabel>Devise</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="FCFA">FCFA</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select><FormMessage/>
                        </FormItem>
                      )} />
                    </div>

                    <div className="pt-4 flex justify-end border-t border-border">
                      <Button type="submit" size="lg" disabled={updateCompany.isPending}>
                        {updateCompany.isPending ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {active === "marque" && <CompanyBrandingCard />}

          {active === "equipe" && <TeamCard />}

          {active === "modules" && <FeatureFlagsCard />}

          {active === "abonnement" && <SubscriptionCard />}

          {active === "preferences" && <PreferencesSection />}

          {active === "danger" && (
            <Card className="shadow-sm border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle size={18}/> Zone de danger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold flex items-center gap-2"><Database size={15} /> Vider toutes les données</p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Repartez d'une base totalement vierge pour l'exploitation réelle. Votre profil
                    d'entreprise et vos paramètres de documents sont conservés. L'historique financier
                    déjà clôturé (ventes, paiements, locations, paie) est protégé et ne sera pas effacé
                    par cette action.
                  </p>
                </div>
                {!canWipe && (
                  <p className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                    Réservé au rôle Patron.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <AlertDialog open={wipeOpen} onOpenChange={(open) => { setWipeOpen(open); if (!open) setWipeConfirm(""); }}>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="rounded-xl" disabled={!canWipe}>
                        <Trash2 size={16} /> Vider toutes les données
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Vider toutes les données ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprime définitivement tous les véhicules, ventes, crédits,
                          dépenses, clients et documents enregistrés pour votre entreprise. Votre profil d'entreprise
                          est conservé. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-1.5">
                        <Label htmlFor="wipe-confirm" className="text-sm">
                          Tapez <strong>{company?.name}</strong> pour confirmer
                        </Label>
                        <Input
                          id="wipe-confirm"
                          value={wipeConfirm}
                          onChange={(e) => setWipeConfirm(e.target.value)}
                          placeholder={company?.name}
                          className="rounded-xl"
                          autoComplete="off"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={wiping || !company?.name || wipeConfirm !== company.name}
                          onClick={async (e) => {
                            e.preventDefault();
                            if (wiping) return;
                            setWiping(true);
                            try {
                              const { cleared, blocked } = await db.wipeAll();
                              toast.success(`${cleared.length} collection(s) vidée(s)`, {
                                description: blocked.length
                                  ? `Protégées et non touchées (historique financier) : ${blocked.length} table(s).`
                                  : undefined,
                              });
                              setWipeConfirm("");
                              setWipeOpen(false);
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "La purge a échoué.");
                            } finally {
                              setWiping(false);
                            }
                          }}
                        >
                          {wiping ? "Suppression..." : "Oui, tout vider"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferencesSection() {
  const role = useRole();
  const navigate = useNavigate();
  const [sound, setSound] = useState(isSoundEnabled());
  const [theme, setThemeState] = useTheme();
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield size={18}/> Préférences & rôle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-semibold mb-3">Rôle réel de votre compte</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled
                className={`text-left rounded-2xl border-2 p-4 transition-all ${role === r.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/30"}`}
              >
                <p className="font-display font-bold">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Le rôle est fourni par l'organisation et vérifié côté serveur. Cette interface ne permet pas de le modifier.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            {theme === "dark" ? <Moon size={20} className="text-primary mt-0.5"/> : <Sun size={20} className="text-primary mt-0.5"/>}
            <div>
              <p className="font-semibold text-sm">Thème sombre</p>
              <p className="text-xs text-muted-foreground">Interface sombre, plus confortable en soirée ou en faible luminosité.</p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(v) => setThemeState(v ? "dark" : "light")} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <Volume2 size={20} className="text-primary mt-0.5"/>
            <div>
              <p className="font-semibold text-sm">Alertes sonores</p>
              <p className="text-xs text-muted-foreground">Bip court à chaque nouvelle vente, retard de crédit ou échéance (assurance, contrôle technique, document).</p>
            </div>
          </div>
          <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundEnabled(v); }} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <PlayCircle size={20} className="text-primary mt-0.5"/>
            <div>
              <p className="font-semibold text-sm">Tutoriel de découverte</p>
              <p className="text-xs text-muted-foreground">Revoir la visite guidée du tableau de bord (menu, recherche, notifications…).</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 shrink-0"
            onClick={() => { relaunchDashboardTour(); navigate({ to: "/app" }); }}
          >
            Relancer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Feature Flags par organisation (item 22 roadmap) — le patron active/masque
 * les modules métier réellement utilisés par son entreprise (ex. un loueur
 * pur n'a pas besoin du module Ventes). Modifie une ligne unique dans
 * company_settings via la RPC set_feature_flags (patron uniquement — la
 * page Paramètres reste accessible à manager mais sans pouvoir toucher ces
 * réglages, cohérent avec `manage.settings` déjà réservé au patron ailleurs).
 */
function FeatureFlagsCard() {
  const role = useRole();
  const canEdit = can(role, "manage.settings");
  const flags = useFeatureFlags();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const toggle = async (key: string, value: boolean) => {
    if (savingKey) return;
    setSavingKey(key);
    try {
      await setFeatureFlags({ [key]: value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le module n'a pas pu être mis à jour.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal size={18}/> Modules activés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Masquez les modules que votre entreprise n'utilise pas (ex. pas de location de véhicules).
          Le module disparaît du menu et de la page pour toute l'équipe.
        </p>
        {!canEdit && (
          <p className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            Réservé au rôle Patron.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURE_FLAGS.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <div className="min-w-0 pr-3">
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                checked={flags[f.key]}
                disabled={!canEdit || savingKey === f.key}
                onCheckedChange={(v) => void toggle(f.key, v)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const PLANS: { id: PlanId; name: string; price: string; period: string; features: string[] }[] = [
  { id: "decouverte", name: "Découverte", price: "Gratuit", period: "sans engagement", features: ["1 utilisateur", "Jusqu'à 5 véhicules", "Ventes cash & fiche véhicule"] },
  { id: "starter", name: "Starter", price: "9 000", period: "FCFA / mois", features: ["2 utilisateurs", "Jusqu'à 20 véhicules", "Ventes cash, maintenance"] },
  { id: "business", name: "Business", price: "24 000", period: "FCFA / mois", features: ["5 utilisateurs", "Jusqu'à 60 véhicules", "Modules à la carte (Location, Crédit, RH, GPS)"] },
  { id: "enterprise", name: "Enterprise", price: "Sur devis", period: "", features: ["Utilisateurs illimités", "Multi-succursale", "API, SLA, formation"] },
];

/**
 * Aucune facturation automatisée n'existe encore côté serveur (pas de table
 * d'abonnement, pas d'intégration de paiement branchée) — le choix de
 * formule est donc mémorisé localement (localStorage), pas synchronisé
 * entre appareils/membres de l'équipe pour l'instant. Reste honnête là-dessus
 * (bandeau explicite) plutôt que de simuler un paiement qui ne débiterait
 * rien réellement. Le changement de formule se fait entièrement DANS
 * l'espace connecté (dialogue), sans jamais naviguer vers le site public ni
 * déconnecter l'utilisateur. Quand un prestataire (Mobile Money via
 * agrégateur, CinetPay recommandé) sera intégré, ce dialogue déclenchera un
 * vrai lien de paiement — jamais de formulaire de carte bancaire stocké
 * côté client, conforme à l'usage local (paiement volontaire répété, pas de
 * prélèvement automatique silencieux).
 */
function SubscriptionCard() {
  const role = useRole();
  const canEdit = can(role, "manage.settings");
  const [currentPlan, setCurrentPlan] = useState<PlanId>(getCurrentPlan);
  const [openSwitch, setOpenSwitch] = useState(false);

  const choosePlan = (id: PlanId) => {
    setCurrentPlan(id);
    setCurrentPlanStorage(id);
    toast.success(`Formule ${PLAN_NAMES[id]} sélectionnée`, {
      description: "Aucun paiement n'a été prélevé — l'intégration Mobile Money n'est pas encore activée.",
    });
    setOpenSwitch(false);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard size={18}/> Abonnement & paiement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Formule actuelle</p>
            <p className="font-display font-bold text-lg mt-0.5">{PLAN_NAMES[currentPlan]}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Actif</span>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Smartphone size={14} className="text-primary" /> Paiement par Mobile Money</p>
          <p className="text-xs text-muted-foreground">
            Aucun prélèvement automatique : chaque mois, un lien de paiement Mobile Money (MTN, Moov, Orange Money) vous est
            envoyé — vous payez vous-même, quand vous voulez, avant l'échéance.
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            Intégration du paiement en ligne pas encore activée sur cet espace — changer de formule ci-dessous ne déclenche
            aucun débit réel pour l'instant.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenSwitch(true)}><CreditCard size={14} /> Changer de formule</Button>
          </div>
        )}
        {!canEdit && (
          <p className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            Réservé au rôle Patron.
          </p>
        )}

        <Dialog open={openSwitch} onOpenChange={setOpenSwitch}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choisir une formule</DialogTitle>
              <DialogDescription>Le changement est immédiat, sans quitter votre espace. Aucun paiement n'est prélevé automatiquement.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {PLANS.map((plan) => {
                const active = plan.id === currentPlan;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => choosePlan(plan.id)}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-display font-bold">{plan.name}</p>
                      {active && <Check size={16} className="text-primary" />}
                    </div>
                    <p className="mt-2 font-display font-bold text-xl">{plan.price}{plan.period && <span className="text-xs font-normal text-muted-foreground"> {plan.period}</span>}</p>
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5"><Check size={11} className="mt-0.5 shrink-0 text-primary" /> {f}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
