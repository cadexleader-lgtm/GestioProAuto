/**
 * Multi-tenant session: the signed-in user, their company and their role.
 * Everything the app persists is scoped to `company.id` and enforced by RLS.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// Generated DB types are refreshed asynchronously; use an untyped handle for the
// tenant tables so the app builds regardless of type-generation timing.
const sb = supabase as any;

export type AppRole = "patron" | "manager" | "terrain";

export interface Company {
  id: string;
  name: string;
  sector: string;
  sub_sector: string | null;
  currency: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  owner_id: string;
}

export interface TenantState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  company: Company | null;
  role: AppRole | null;
}

let state: TenantState = { loading: true, userId: null, email: null, company: null, role: null };
const listeners = new Set<() => void>();

function set(patch: Partial<TenantState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getTenant() {
  return state;
}

export function useTenant(): TenantState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/** Loads the current user, their membership and company. Safe to call repeatedly. */
export async function loadTenant(): Promise<TenantState> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    set({ loading: false, userId: null, email: null, company: null, role: null });
    return state;
  }

  const { data: membership } = await sb
    .from("company_members")
    .select("role, company_id, companies(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const company = (membership as any)?.companies ?? null;
  set({
    loading: false,
    userId: user.id,
    email: user.email ?? null,
    company: company as Company | null,
    role: ((membership as any)?.role as AppRole) ?? null,
  });
  return state;
}

/** Creates the company for a brand-new patron and links them as owner. */
export async function createCompany(input: {
  name: string;
  sector: string;
  subSector?: string;
  phone?: string;
  address?: string;
  currency?: string;
  fullName?: string;
}): Promise<Company> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Vous devez être connecté.");

  const { data: company, error } = await sb
    .from("companies")
    .insert({
      name: input.name,
      sector: input.sector,
      sub_sector: input.subSector ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      currency: input.currency ?? "XOF",
      owner_id: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { error: memberError } = await sb
    .from("company_members")
    .insert({ company_id: (company as any).id, user_id: user.id, role: "patron" });
  if (memberError) throw memberError;

  await sb
    .from("profiles")
    .upsert({ id: user.id, full_name: input.fullName ?? user.email ?? null });

  await loadTenant();
  return company as unknown as Company;
}

export async function updateCompany(patch: Partial<Company>) {
  if (!state.company) return;
  const { error } = await sb.from("companies").update(patch as any).eq("id", state.company.id);
  if (error) throw error;
  await loadTenant();
}

export function resetTenant() {
  set({ loading: false, userId: null, email: null, company: null, role: null });
}

/** Role hierarchy check used to gate destructive / administrative UI. */
export function roleAtLeast(role: AppRole | null, min: AppRole): boolean {
  const rank: Record<AppRole, number> = { terrain: 1, manager: 2, patron: 3 };
  if (!role) return false;
  return rank[role] >= rank[min];
}
