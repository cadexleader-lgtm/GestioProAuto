import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProduct, useUpdateProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const schema = z.object({
  name: z.string().min(1, "Requis"),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "Requis"),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
});

export function ProductDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (open: boolean) => void; product?: any }) {
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", sku: "", category: "", unit: "u", price: 0, cost: 0, stock: 0, lowStockThreshold: 5
    }
  });

  useEffect(() => {
    if (product && open) {
      form.reset(product);
    } else if (!open) {
      form.reset({ name: "", sku: "", category: "", unit: "u", price: 0, cost: 0, stock: 0, lowStockThreshold: 5 });
    }
  }, [product, open, form]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, data });
        toast.success("Produit modifié");
      } else {
        await createProduct.mutateAsync({ data });
        toast.success("Produit créé");
      }
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      onOpenChange(false);
    } catch (error) {
      toast.error("Une erreur est survenue");
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU / Réf</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Prix de vente (FCFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="cost" render={({ field }) => (
                <FormItem><FormLabel>Prix d'achat (FCFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="stock" render={({ field }) => (
                <FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Unité</FormLabel><FormControl><Input {...field} placeholder="u, kg, L..." /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                <FormItem><FormLabel>Alerte à</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement..." : "Enregistrer"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}