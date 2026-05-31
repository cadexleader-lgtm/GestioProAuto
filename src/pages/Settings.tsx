import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetCompany, useUpdateCompany, useListSectors, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const schema = z.object({
  name: z.string().min(1, "Requis"),
  ownerName: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  country: z.string().min(1, "Requis"),
  city: z.string().min(1, "Requis"),
  currency: z.string().min(1, "Requis"),
  sectorId: z.string().min(1, "Requis"),
});

export function Settings() {
  const queryClient = useQueryClient();
  const { data: company, isLoading: isLoadingCompany } = useGetCompany();
  const { data: sectors, isLoading: isLoadingSectors } = useListSectors();
  const updateCompany = useUpdateCompany();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", ownerName: "", email: "", phone: "", country: "Bénin", city: "Cotonou", currency: "FCFA", sectorId: ""
    }
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
        sectorId: company.sectorId
      });
    }
  }, [company, form]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await updateCompany.mutateAsync({ data });
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoadingCompany || isLoadingSectors) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[500px] rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez les informations de votre entreprise.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Profil de l'entreprise</CardTitle>
        </CardHeader>
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
                  <FormItem><FormLabel>Email professionnel</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un pays" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Bénin">Bénin</SelectItem>
                        <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                        <SelectItem value="Sénégal">Sénégal</SelectItem>
                        <SelectItem value="Togo">Togo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une devise" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FCFA">FCFA (XOF/XAF)</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="sectorId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secteur d'activité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un secteur" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )} />
              </div>

              <div className="pt-4 flex justify-end border-t border-border">
                <Button type="submit" size="lg" disabled={updateCompany.isPending}>
                  {updateCompany.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}