import { useState } from "react";
import { useListProducts, useDeleteProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import { Search, Plus, Package, Edit2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDialogPro as ProductDialog } from "@/components/forms/ProductDialogPro";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function Stock() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: products, isLoading } = useListProducts({ search, lowStockOnly });
  const deleteProduct = useDeleteProduct();

  const [productDialog, setProductDialog] = useState<{ open: boolean, product?: any }>({ open: false });

  const handleDelete = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      try {
        await deleteProduct.mutateAsync({ id });
        toast.success("Produit supprimé");
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      } catch (e) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Stock</h1>
          <p className="text-muted-foreground mt-1">Gérez vos produits et alertes.</p>
        </div>
        <Button onClick={() => setProductDialog({ open: true })} className="gap-2 shadow-md">
          <Plus size={18} /> Nouveau produit
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un produit..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
          <Label htmlFor="low-stock" className="text-sm font-medium">Alertes rupture uniquement</Label>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Produit</th>
                  <th className="px-6 py-4 font-semibold">SKU / Catégorie</th>
                  <th className="px-6 py-4 font-semibold">Prix</th>
                  <th className="px-6 py-4 font-semibold">Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 inline-block" /></td>
                    </tr>
                  ))
                ) : products?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-12 h-12 mb-4 opacity-20" />
                        <p>Aucun produit trouvé.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products?.map((product) => {
                    const isLow = product.stock <= product.lowStockThreshold;
                    const isWarning = product.stock <= product.lowStockThreshold * 1.5 && !isLow;
                    return (
                      <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.unit}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {product.sku && <div className="text-xs font-mono">{product.sku}</div>}
                          {product.category && <div>{product.category}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{formatFCFA(product.price)}</div>
                          <div className="text-xs text-muted-foreground">Marge: {product.price > 0 ? Math.round(((product.price - product.cost) / product.price) * 100) : 0}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            isLow ? 'bg-destructive/10 text-destructive' : 
                            isWarning ? 'bg-accent/20 text-accent-foreground' : 
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          }`}>
                            {product.stock} {product.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setProductDialog({ open: true, product })} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProductDialog 
        open={productDialog.open} 
        product={productDialog.product} 
        onOpenChange={(open) => setProductDialog({ open, product: undefined })} 
      />
    </div>
  );
}