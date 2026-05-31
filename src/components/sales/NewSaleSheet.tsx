import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, X, Receipt, CheckCircle2 } from "lucide-react";
import { useListProducts, useCreateSale, getGetDashboardQueryKey, getListSalesQueryKey, getListProductsQueryKey, useGetCompany } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PrintableTicket } from "./PrintableTicket";

export function NewSaleSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: company } = useGetCompany();
  const [search, setSearch] = useState("");
  const { data: products } = useListProducts({ search });
  const createSale = useCreateSale();

  const [items, setItems] = useState<Array<{ product: any, quantity: number, unitPriceOverride?: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'mobile_money'|'card'|'credit'>('cash');
  const [sellerName, setSellerName] = useState(company?.ownerName || "");
  const [completedSale, setCompletedSale] = useState<any>(null);

  const handleAddProduct = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, unitPriceOverride: product.price }];
    });
    setSearch("");
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.unitPriceOverride || item.product.price) * item.quantity, 0);
  const estimatedMargin = items.reduce((sum, item) => sum + ((item.unitPriceOverride || item.product.price) - item.product.cost) * item.quantity, 0);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    try {
      const result = await createSale.mutateAsync({
        data: {
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, unitPriceOverride: i.unitPriceOverride })),
          paymentMethod,
          sellerName: sellerName || company?.ownerName
        }
      });
      toast.success("Vente enregistrée");
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      
      setCompletedSale(result);
      setItems([]);
      onOpenChange(false);
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle>Nouvelle vente</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <Label className="mb-2 block">Rechercher un produit</Label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Ex: Ciment, Riz..." 
                  className="pl-10" 
                />
              </div>
              {search && products && (
                <div className="absolute z-10 w-[calc(100%-3rem)] bg-popover border border-border shadow-lg rounded-lg mt-1 max-h-60 overflow-y-auto">
                  {products.map(p => (
                    <div 
                      key={p.id} 
                      className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center"
                      onClick={() => handleAddProduct(p)}
                    >
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                      </div>
                      <div className="font-semibold text-primary">{formatFCFA(p.price)}</div>
                    </div>
                  ))}
                  {products.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">Aucun produit trouvé</div>}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {items.map(item => (
                <div key={item.product.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex gap-4 relative group">
                  <button onClick={() => handleRemoveItem(item.product.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">{item.product.name}</h3>
                    <p className={`text-xs mt-0.5 ${item.quantity > item.product.stock ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      En stock: {item.product.stock}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-primary">{formatFCFA(item.unitPriceOverride || item.product.price)}</span>
                    <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
                      <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="px-2 py-1 text-muted-foreground hover:bg-muted"><Minus size={14}/></button>
                      <span className="px-2 text-sm font-semibold w-8 text-center">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="px-2 py-1 text-muted-foreground hover:bg-muted"><Plus size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Marge estimée</Label>
                    <div className="h-10 flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold rounded-xl border border-emerald-100 dark:border-emerald-500/30 text-sm">
                      +{formatFCFA(estimatedMargin)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Moyen de paiement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{id: 'cash', label: 'Espèces'}, {id: 'mobile_money', label: 'Mobile Money'}, {id: 'card', label: 'Carte'}, {id: 'credit', label: 'Crédit'}].map((p) => (
                      <Button
                        key={p.id}
                        variant={paymentMethod === p.id ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod(p.id as any)}
                        className="h-10 text-sm"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Vendeur</Label>
                  <Input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Nom du vendeur" />
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-border bg-muted/30">
            <div className="flex justify-between mb-4">
              <span className="text-muted-foreground font-medium">Total à payer</span>
              <span className="text-2xl font-bold font-display text-foreground">{formatFCFA(subtotal)}</span>
            </div>
            <Button 
              className="w-full h-12 text-base font-semibold" 
              onClick={handleSubmit}
              disabled={items.length === 0 || createSale.isPending}
            >
              {createSale.isPending ? "Enregistrement..." : <><CheckCircle2 className="mr-2 h-5 w-5" /> Valider la vente</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {completedSale && (
        <PrintableTicket sale={completedSale} open={!!completedSale} onOpenChange={() => setCompletedSale(null)} />
      )}
    </>
  );
}