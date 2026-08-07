import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetCompany, useUpdateCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { SUB_SECTORS_ARRAY } from "@/lib/sectors";
import { db } from "@/lib/demo-store";
import { Database, Trash2, Shield, Volume2 } from "lucide-react";
import { ROLES, setRole, useRole } from "@/lib/roles";
import { isSoundEnabled, setSoundEnabled } from "@/lib/notifications";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const schema = z.object({
  name: z.string().min(1, "Requis"),
  ownerName: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  country: z.string().min(1, "Requis"),
  city: z.string().min(1, "Requis"),
  currency: z.string().min(1, "Requis"),
  subSectorId: z.string().min(1, "Requis"),
});

export function Settings() {
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useGetCompany();
  const updateCompany = useUpdateCompany();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", ownerName: "", email: "", phone: "", country: "Sénégal", city: "Dakar", currency: "FCFA", subSectorId: "boutique",
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
        subSectorId: company.subSectorId || "boutique",
      });
    }
  }, [company, form]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await updateCompany.mutateAsync({ data: { ...data, sectorId: "commerce" } });
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[500px] rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez les informations de votre entreprise.</p>
      </div>

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
                <FormField control={form.control} name="subSectorId" render={({ field }) => (
                  <FormItem><FormLabel>Activité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SUB_SECTORS_ARRAY.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
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

      <RolesAndAlertsCard />



      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database size={18}/> Données de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Repartez d'une base totalement vierge pour l'exploitation réelle. Votre profil
            d'entreprise et vos paramètres de documents sont conservés.
          </p>
          <div className="flex flex-wrap gap-3">


            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="rounded-xl">
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
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      void db.wipeAll().then(() =>
                        toast.success("Toutes les données ont été effacées"),
                      );
                    }}
                  >
                    Oui, tout vider
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RolesAndAlertsCard() {
  const role = useRole();
  const [sound, setSound] = useState(isSoundEnabled());
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield size={18}/> Rôles & notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-semibold mb-3">Rôle actif sur cet appareil</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setRole(r.id); toast.success(`Rôle : ${r.label}`); }}
                className={`text-left rounded-2xl border-2 p-4 transition-all ${role === r.id ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
              >
                <p className="font-display font-bold">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Le rôle limite les actions dans l'interface (suppressions, finances). Pour une sécurité serveur complète, activez l'authentification Cloud.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <Volume2 size={20} className="text-primary mt-0.5"/>
            <div>
              <p className="font-semibold text-sm">Alertes sonores</p>
              <p className="text-xs text-muted-foreground">Bip court à chaque nouvelle vente, retard de crédit ou stock bas.</p>
            </div>
          </div>
          <Switch checked={sound} onCheckedChange={(v) => { setSound(v); setSoundEnabled(v); }} />
        </div>
      </CardContent>
    </Card>
  );
}


