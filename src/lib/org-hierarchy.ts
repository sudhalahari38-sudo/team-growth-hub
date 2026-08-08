/**
 * Simulated reporting hierarchy between managers.
 *
 * In production this would come from the HRIS org chart. Here we keep a static
 * map of manager -> their own manager (second-line / skip-level manager), which
 * lets us split a leader's team into DIRECT reportees (employees they manage
 * themselves) and INDIRECT reportees (employees managed by one of their
 * reporting managers).
 */

/** managerName -> the manager they report to */
export const MANAGER_REPORTS_TO: Record<string, string> = {
  "Brian Cole": "Aarti Sharma",
  "Elena Rossi": "Daniel Owusu",
  "Grace Park": "Carla Nguyen",
  "Faisal Ahmed": "Carla Nguyen",
  "Isla Murphy": "Hiro Tanaka",
  "Jamal Reed": "Hiro Tanaka",
};

/** Managers that report (directly or transitively) to `leader`. */
export function downlineManagers(leader: string): string[] {
  const out = new Set<string>();
  let frontier = [leader];
  while (frontier.length) {
    const next: string[] = [];
    for (const [mgr, boss] of Object.entries(MANAGER_REPORTS_TO)) {
      if (frontier.includes(boss) && !out.has(mgr)) {
        out.add(mgr);
        next.push(mgr);
      }
    }
    frontier = next;
  }
  return Array.from(out);
}

export type ReportingLine = "direct" | "indirect" | null;

/** How a row's employee relates to `leader`: direct, indirect, or not in team. */
export function reportingLine(
  row: { managerName: string },
  leader: string | undefined,
): ReportingLine {
  if (!leader) return null;
  if (row.managerName === leader) return "direct";
  return downlineManagers(leader).includes(row.managerName) ? "indirect" : null;
}

/** All rows in a leader's reporting hierarchy (direct + indirect). */
export function teamRows<T extends { managerName: string }>(
  rows: T[],
  leader: string | undefined,
): T[] {
  return rows.filter((r) => reportingLine(r, leader) !== null);
}

export type TeamLevel = "all" | "direct" | "indirect";

export function filterByTeamLevel<T extends { managerName: string }>(
  rows: T[],
  leader: string | undefined,
  level: TeamLevel,
): T[] {
  if (level === "all") return rows;
  return rows.filter((r) => reportingLine(r, leader) === level);
}
