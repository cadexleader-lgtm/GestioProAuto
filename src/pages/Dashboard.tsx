import { useGetCompany } from "@workspace/api-client-react";
import { CommerceDashboard } from "./CommerceDashboard";
import { RestaurantDashboard } from "./restaurant/RestaurantDashboard";
import { VehiculesDashboard } from "./vehicules/VehiculesDashboard";
import { ElectroDashboard } from "./electromenager/ElectroDashboard";
import { getSubSectorConfig } from "@/lib/sectors";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sector-aware dashboard router. Renders the dashboard adapted to the
 * sub-sector chosen at signup.
 */
export function Dashboard() {
  const { data: company, isLoading } = useGetCompany();

  if (isLoading || !company) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const sub = getSubSectorConfig(company.subSectorId);

  switch (sub.id) {
    case "restaurant":
      return <RestaurantDashboard />;
    case "vehicules":
      return <VehiculesDashboard />;
    case "electromenager":
      return <ElectroDashboard />;
    case "boutique":
    default:
      return <CommerceDashboard />;
  }
}
