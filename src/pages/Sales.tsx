import { useState } from "react";
import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatFCFA, formatDate } from "@/lib/format";
import { Receipt, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintableTicket } from "@/components/sales/PrintableTicket";

export function Sales() {
  const { data: sales, isLoading } = useListSales();
  const [selectedSale, setSelectedSale] = useState<any>(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Ventes</h1>
          <p className="text-muted-foreground mt-1">Historique complet de vos transactions.</p>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Référence</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Montant</th>
                  <th className="px-6 py-4 font-semibold">Paiement</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 inline-block" /></td>
                    </tr>
                  ))
                ) : sales?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="w-12 h-12 mb-4 opacity-20" />
                        <p>Aucune vente trouvée.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sales?.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => setSelectedSale(sale)}>
                      <td className="px-6 py-4 font-medium text-primary">{sale.reference || "-"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(sale.createdAt)}</td>
                      <td className="px-6 py-4 font-bold">{formatFCFA(sale.total)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Receipt size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PrintableTicket sale={selectedSale} open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)} />
    </div>
  );
}