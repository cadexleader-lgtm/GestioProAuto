import { useGetCompany } from "@workspace/api-client-react";
import { CommerceDashboard } from "./CommerceDashboard";
import { RestaurantDashboard } from "./restaurant/RestaurantDashboard";
import { SectorComingSoon } from "./SectorComingSoon";
import { getSectorConfig } from "@/lib/sectors";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sector-aware dashboard router. Renders the dashboard adapted to the
 * sector chosen at signup. Each sector module owns its own dashboard.
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

  const sector = getSectorConfig(company.sectorId);

  switch (sector.id) {
    case "restaurant":
      return <RestaurantDashboard />;
    case "commerce":
    case "phones":
    case "supermarket":
      return <CommerceDashboard />;
    default:
      return <SectorComingSoon sector={sector} />;
  }
}
