import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatFCFA, formatDate } from "@/lib/format";
import { useGetCompany } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintableTicket({ sale, open, onOpenChange }: { sale: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: company } = useGetCompany();

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6 sm:p-8">
        <div className="flex justify-end mb-4 no-print">
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer size={16} /> Imprimer
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-xl">{company?.name}</h2>
          <p className="text-sm text-muted-foreground">{company?.city}, {company?.country}</p>
          {company?.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
        </div>

        <div className="flex justify-between text-sm mb-6 pb-4 border-b border-dashed border-border">
          <div>
            <p><strong>Date:</strong> {formatDate(sale.createdAt)}</p>
            <p><strong>Réf:</strong> {sale.reference}</p>
          </div>
          <div className="text-right">
            <p><strong>Vendeur:</strong> {sale.sellerName}</p>
            <p><strong>Paiement:</strong> {sale.paymentMethod}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2">Qte x Article</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sale.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="py-3">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">{item.quantity} x {formatFCFA(item.unitPrice)}</div>
                </td>
                <td className="py-3 text-right font-medium">{formatFCFA(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-border pt-4 flex justify-between items-center mb-8">
          <span className="font-bold text-lg">TOTAL</span>
          <span className="font-bold text-xl font-display">{formatFCFA(sale.total)}</span>
        </div>

        <div className="text-center text-sm text-muted-foreground italic">
          Merci de votre visite !
        </div>
      </DialogContent>
    </Dialog>
  );
}