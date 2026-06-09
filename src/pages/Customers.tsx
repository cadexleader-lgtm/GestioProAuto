import { useState } from "react";
import { useListCustomers, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDialogPro as CustomerDialog } from "@/components/forms/CustomerDialogPro";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";

export function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search });
  const deleteCustomer = useDeleteCustomer();

  const [customerDialog, setCustomerDialog] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce client ?")) {
      try {
        await deleteCustomer.mutateAsync({ id });
        toast.success("Client supprimé");
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      } catch (e) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">Gérez votre base de clients.</p>
        </div>
        <Button onClick={() => setCustomerDialog(true)} className="gap-2 shadow-md">
          <Plus size={18} /> Nouveau client
        </Button>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom, tel, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nom</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Date d'ajout</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {isLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 inline-block" /></td>
                    </tr>
                  ))
                ) : customers?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <p>Aucun client trouvé.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers?.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground">{customer.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {customer.phone && <div className="text-foreground">{customer.phone}</div>}
                        {customer.email && <div className="text-xs">{customer.email}</div>}
                        {!customer.phone && !customer.email && "-"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(customer.createdAt, 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(customer.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
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

      <CustomerDialog open={customerDialog} onOpenChange={setCustomerDialog} />
    </div>
  );
}