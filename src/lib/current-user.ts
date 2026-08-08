/**
 * Simulated authenticated identity + client-side Row-Level Security.
 *
 * In production this would come from the auth provider (Lovable Cloud /
 * Supabase JWT) and RLS would be enforced server-side via Postgres policies
 * such as:
 *
 *   create policy "managers see own team"
 *   on public.training_records for select
 *   using (manager_id = auth.uid()
 *          or exists (select 1 from public.user_roles
 *                     where user_id = auth.uid() and role = 'leadership'));
 *
 * Here we simulate the same boundary by filtering the in-memory dataset
 * based on the selected identity.
 */
import type { TrainingRecord } from "./training-types";

export type IdentityRole = "admin" | "leadership" | "manager";

export interface Identity {
  id: string;
  name: string;
  role: IdentityRole;
  /** Manager name as it appears in the dataset (only used when role = manager) */
  managerName?: string;
  department?: string;
}

export const ADMIN_IDENTITY: Identity = {
  id: "admin",
  name: "Admin (full access)",
  role: "admin",
};

export const LEADERSHIP_IDENTITY: Identity = {
  id: "leadership",
  name: "Leadership View (all teams)",
  role: "leadership",
};

/** Build the identity list from the dataset: admin + leadership + one per manager. */
export function buildIdentities(data: TrainingRecord[]): Identity[] {
  const map = new Map<string, Identity>();
  for (const r of data) {
    if (!map.has(r.managerName)) {
      map.set(r.managerName, {
        id: `mgr:${r.managerName}`,
        name: r.managerName,
        role: "manager",
        managerName: r.managerName,
        department: r.department,
      });
    }
  }
  const managers = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return [ADMIN_IDENTITY, LEADERSHIP_IDENTITY, ...managers];
}

/* ------------------------------- Permissions ------------------------------ */

/** Can perform administrative actions (upload CSV, sync LMS, settings, reset). */
export function canAdminister(identity: Identity): boolean {
  return identity.role === "admin";
}

/** Can view organization-wide data (leadership dashboard, all teams). */
export function canViewOrg(identity: Identity): boolean {
  return identity.role === "admin" || identity.role === "leadership";
}

/**
 * RLS gate. Admin & leadership see everything; managers see only their own
 * team's rows. Equivalent SQL policy:
 *   USING (manager_name = current_setting('app.user.manager')
 *          OR has_role(auth.uid(), 'leadership')
 *          OR has_role(auth.uid(), 'admin'))
 */
export function applyRls<T extends { managerName: string }>(
  rows: T[],
  identity: Identity,
): T[] {
  if (canViewOrg(identity)) return rows;
  return teamRows(rows, identity.managerName);
}

/* ----------------------------- Accounts & login ---------------------------- */

/** A signed-in account. The account role determines which Viewers are allowed. */
export interface Account {
  id: string;
  name: string;
  role: IdentityRole;
  /** Manager name as it appears in the dataset (only for manager accounts) */
  managerName?: string;
  department?: string;
}

export const VIEWER_LABELS: Record<IdentityRole, string> = {
  admin: "Admin View",
  leadership: "Leadership View",
  manager: "Manager View",
};

/** Which viewers an account may switch into. */
export function allowedViewers(role: IdentityRole): IdentityRole[] {
  if (role === "admin") return ["admin", "leadership", "manager"];
  if (role === "leadership") return ["leadership", "manager"];
  return ["manager"];
}

/** Build the identity used by the dashboard from account + selected viewer. */
export function identityForViewer(
  account: Account,
  viewer: IdentityRole,
  impersonatedManager?: string,
): Identity {
  if (viewer === "admin") return ADMIN_IDENTITY;
  if (viewer === "leadership") return LEADERSHIP_IDENTITY;
  const managerName = account.managerName ?? impersonatedManager ?? "";
  return {
    id: `mgr:${managerName}`,
    name: managerName || "Manager",
    role: "manager",
    managerName,
    department: account.department,
  };
}

const ACCOUNT_KEY = "ld.account";

export function loadAccount(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

export function saveAccount(a: Account | null) {
  if (typeof window === "undefined") return;
  if (a) window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
  else window.localStorage.removeItem(ACCOUNT_KEY);
}
