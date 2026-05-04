/**
 * Skillsoft Percipio integration — server-only helpers.
 *
 * Architecture:
 *   Browser (Sync button) ──► createServerFn ──► Percipio REST API
 *                                              │
 *                                              ├─ auth via static bearer token (PERCIPIO_API_KEY)
 *                                              │  OR OAuth2 client_credentials (recommended for prod)
 *                                              ├─ paginates user/course report
 *                                              └─ normalizes into TrainingRecord[]
 *
 * In production, replace the `fetch` loop with a scheduled job that writes
 * into Postgres (Lovable Cloud) and the dashboard reads from the table —
 * see TrainingRecord SQL schema notes in src/lib/training-types.ts.
 *
 * Required env (server-only):
 *   PERCIPIO_API_KEY     – bearer token from Percipio admin console
 *   PERCIPIO_ORG_ID      – your Percipio organization UUID
 *   PERCIPIO_BASE_URL    – optional, defaults to https://api.percipio.com
 */
import type { TrainingRecord, CourseCategory, TrainingStatus, TrainingType } from "./training-types";

interface PercipioRow {
  userFullName?: string;
  userId?: string;
  manager?: string;
  department?: string;
  contentTitle?: string;
  contentType?: string;
  category?: string;
  isMandatory?: boolean;
  firstAccessDate?: string;
  lastAccessDate?: string;
  completedDate?: string;
  status?: string;
  dueDate?: string;
}

function mapStatus(s?: string): TrainingStatus {
  const v = (s ?? "").toLowerCase();
  if (v.includes("complet")) return "Completed";
  if (v.includes("progress") || v.includes("started")) return "In Progress";
  return "Not Started";
}
function mapCategory(c?: string): CourseCategory {
  const v = (c ?? "").toLowerCase();
  if (v.includes("cdp") || v.includes("career")) return "CDP";
  if (v.includes("compli")) return "Compliance";
  if (v.includes("coach") || v.includes("leader")) return "Coaching";
  if (v.includes("non-tech") || v.includes("soft")) return "Non-Technical";
  if (v.includes("tech") || v.includes("data") || v.includes("dev")) return "Technical";
  return "Non-Technical";
}
function mapType(b?: boolean): TrainingType {
  return b ? "Mandatory" : "Optional";
}
function isoDay(s?: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function normalizePercipio(rows: PercipioRow[]): TrainingRecord[] {
  return rows
    .map((r, i): TrainingRecord | null => {
      const name = r.userFullName?.trim();
      const course = r.contentTitle?.trim();
      const due = isoDay(r.dueDate ?? r.lastAccessDate);
      if (!name || !course || !due) return null;
      return {
        employeeName: name,
        employeeId: r.userId ?? `P${i + 1}`,
        managerName: r.manager?.trim() || "Unassigned",
        department: r.department?.trim() || "Unassigned",
        courseName: course,
        courseCategory: mapCategory(r.category),
        trainingType: mapType(r.isMandatory),
        assignedDate: isoDay(r.firstAccessDate) ?? due,
        dueDate: due,
        completionDate: isoDay(r.completedDate),
        status: mapStatus(r.status),
      };
    })
    .filter((x): x is TrainingRecord => x !== null);
}

export async function fetchPercipioReport(): Promise<TrainingRecord[]> {
  const key = process.env.PERCIPIO_API_KEY;
  const org = process.env.PERCIPIO_ORG_ID;
  const base = process.env.PERCIPIO_BASE_URL ?? "https://api.percipio.com";
  if (!key) throw new Error("PERCIPIO_API_KEY is not configured");
  if (!org) throw new Error("PERCIPIO_ORG_ID is not configured");

  // Percipio learning-activity report endpoint. Real implementations
  // poll a job ID — this is the simplified "give me the latest page" call.
  const url = `${base}/reporting/v1/organizations/${org}/report-requests/learning-activity`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sort: { field: "lastAccessDate", order: "desc" },
      audience: "ALL",
      transformName: "TRANSCRIPT_REGISTRATIONS",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Percipio API ${res.status}: ${text.slice(0, 200)}`);
  }

  const payload = (await res.json()) as { rows?: PercipioRow[] } | PercipioRow[];
  const rows = Array.isArray(payload) ? payload : (payload.rows ?? []);
  return normalizePercipio(rows);
}
