import type { NudgeTier } from "./nudge-templates";

/**
 * Audit log of sent nudges, appended to each employee's training history.
 * Persisted locally today; swap for a DB table when Cloud persistence is on.
 */
export interface NudgeHistoryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  courseName: string;
  tier: NudgeTier;
  daysOverdue: number;
  subject: string;
  sentAt: string;
  sentBy: string;
  channel: string;
}

const KEY = "ld.nudge-history.v1";
const listeners = new Set<() => void>();
let cache: NudgeHistoryEntry[] | null = null;

function read(): NudgeHistoryEntry[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as NudgeHistoryEntry[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: NudgeHistoryEntry[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next.slice(-500)));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

export function nudgeHistory(): NudgeHistoryEntry[] {
  return read();
}

export function historyFor(employeeId: string, courseName?: string): NudgeHistoryEntry[] {
  return read()
    .filter((e) => e.employeeId === employeeId && (!courseName || e.courseName === courseName))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function logNudge(entry: NudgeHistoryEntry) {
  write([...read(), entry]);
}

export function subscribeNudgeHistory(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
