/**
 * Data access layer for company/session info.
 * Reads and writes go through the tenant-scoped Supabase store (`db`),
 * so every hook returns the signed-in company's real data.
 * The hook names are kept stable for the existing pages (aliased in
 * tsconfig.json as `@workspace/api-client-react`).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenant, updateCompany as persistCompany } from "./tenant";

export interface Company {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  country: string;
  city: string;
  currency: string;
  sectorId?: string;
  subSectorId?: string;
}

export interface Sector {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const sectors: Sector[] = [
  { id: "automobile", name: "Automobile", icon: "🚗", description: "Vente, location, crédit véhicules" },
];

// ---------- Query keys ----------
export const getGetCompanyQueryKey = () => ["company"] as const;

function currentCompany(): Company {
  const t = getTenant();
  return {
    id: t.company?.id ?? "",
    name: t.company?.name ?? "Mon entreprise",
    ownerName: t.email?.split("@")[0] ?? "",
    email: t.email ?? "",
    phone: t.company?.phone ?? undefined,
    country: "Sénégal",
    city: t.company?.address ?? "",
    currency: t.company?.currency ?? "XOF",
    sectorId: t.company?.sector,
    subSectorId: t.company?.sub_sector ?? undefined,
  };
}

// ---------- Company ----------
export function useGetCompany() {
  const t = getTenant();
  return useQuery({
    queryKey: [...getGetCompanyQueryKey(), t.company?.id ?? "none"],
    queryFn: async () => currentCompany(),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Company> }) => {
      await persistCompany({
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.city !== undefined ? { address: data.city ?? null } : {}),
        ...(data.sectorId ? { sector: data.sectorId } : {}),
        ...(data.subSectorId !== undefined ? { sub_sector: data.subSectorId ?? null } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
      });
      return currentCompany();
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useListSectors() {
  return useQuery({ queryKey: ["sectors"], queryFn: async () => sectors });
}
