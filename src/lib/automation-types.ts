/**
 * Automated Compliance Reporting & Nudge Engine — types + schedule math.
 *
 * An automation is a saved configuration (report type, scope, recipients,
 * cadence). The engine executes it on schedule and appends a run record.
 */
import type { NudgeTier } from "./nudge-templates";

export type ReportType = "compliance" | "completion" | "overdue";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  compliance: "Compliance",
  completion: "Training Completion",
  overdue: "Overdue Training",
};

export type Frequency = "daily" | "alternate" | "weekly" | "monthly" | "custom";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  alternate: "Every other day",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export type RecipientGroup = "organization" | "leadership" | "managers" | "custom";

export const RECIPIENT_LABELS: Record<RecipientGroup, string> = {
  organization: "Entire organization",
  leadership: "Leadership",
  managers: "Managers",
  custom: "Specific email group",
};

export type IncludeStatus = "inProgress" | "completed" | "overdue" | "notStarted";

export interface AutomationConfig {
  id: string;
  name: string;
  reportType: ReportType;
  frequency: Frequency;
  /** weekly: 0-6 (Sun-Sat) */
  weekday: number;
  /** monthly: 1-28 */
  monthDay: number;
  /** custom: run every N days */
  intervalDays: number;
  /** HH:MM 24h local delivery time */
  time: string;
  recipientGroup: RecipientGroup;
  /** used when recipientGroup = custom */
  customEmails: string[];
  /** empty array = all */
  courses: string[];
  departments: string[];
  include: Record<IncludeStatus, boolean>;
  attachCsv: boolean;
  nudgesEnabled: boolean;
  nudgeTiers: Record<NudgeTier, boolean>;
  active: boolean;
  createdAt: string;
  nextRunAt: string;
}

export interface RunStep {
  key: "pull" | "clean" | "analyze" | "distribute" | "nudge";
  label: string;
  detail: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  automationName: string;
  reportType: ReportType;
  startedAt: string;
  finishedAt: string;
  trigger: "scheduled" | "manual" | "catch-up";
  status: "success" | "failed";
  error?: string;
  periodFrom: string;
  periodTo: string;
  rowsIn: number;
  rowsClean: number;
  duplicatesRemoved: number;
  invalidRemoved: number;
  recipients: string[];
  subject: string;
  summary: string;
  csv: string;
  metrics: {
    totalAssigned: number;
    completed: number;
    completionRate: number;
    overdueCount: number;
    notStarted: number;
    inProgress: number;
    mandatoryComplianceRate: number;
    atRiskLearners: number;
    outstandingMandatory: number;
  };
  nudges: Record<NudgeTier, number>;
  steps: RunStep[];
}

/* ------------------------------ schedule math ----------------------------- */

export function defaultAutomation(): AutomationConfig {
  const id = `auto_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const cfg: AutomationConfig = {
    id,
    name: "Weekly compliance report",
    reportType: "compliance",
    frequency: "weekly",
    weekday: 1,
    monthDay: 1,
    intervalDays: 3,
    time: "09:00",
    recipientGroup: "leadership",
    customEmails: [],
    courses: [],
    departments: [],
    include: { inProgress: true, completed: true, overdue: true, notStarted: true },
    attachCsv: true,
    nudgesEnabled: true,
    nudgeTiers: { reminder: true, warning: true, escalation: true },
    active: true,
    createdAt: new Date().toISOString(),
    nextRunAt: new Date().toISOString(),
  };
  cfg.nextRunAt = computeNextRun(cfg, new Date()).toISOString();
  return cfg;
}

function atTime(d: Date, time: string): Date {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  const out = new Date(d);
  out.setHours(h || 0, m || 0, 0, 0);
  return out;
}

/** Next run strictly after `from`. */
export function computeNextRun(cfg: AutomationConfig, from: Date = new Date()): Date {
  const base = atTime(from, cfg.time);
  const step = (d: Date, days: number) => {
    const n = new Date(d);
    n.setDate(n.getDate() + days);
    return n;
  };

  if (cfg.frequency === "monthly") {
    let next = atTime(from, cfg.time);
    next.setDate(Math.min(Math.max(cfg.monthDay, 1), 28));
    if (next <= from) {
      next = new Date(next);
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  if (cfg.frequency === "weekly") {
    let next = base;
    const target = cfg.weekday;
    let delta = (target - next.getDay() + 7) % 7;
    next = step(next, delta);
    if (next <= from) next = step(next, 7);
    return next;
  }

  const every =
    cfg.frequency === "daily" ? 1 : cfg.frequency === "alternate" ? 2 : Math.max(1, cfg.intervalDays);
  let next = base;
  while (next <= from) next = step(next, every);
  return next;
}

export function frequencyLabel(cfg: AutomationConfig): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (cfg.frequency === "weekly") return `Weekly · ${days[cfg.weekday]} ${cfg.time}`;
  if (cfg.frequency === "monthly") return `Monthly · day ${cfg.monthDay} ${cfg.time}`;
  if (cfg.frequency === "custom") return `Every ${cfg.intervalDays} days · ${cfg.time}`;
  return `${FREQUENCY_LABELS[cfg.frequency]} · ${cfg.time}`;
}

export function resolveRecipients(cfg: AutomationConfig, managers: string[]): string[] {
  const slug = (n: string) => `${n.toLowerCase().replace(/[^a-z]+/g, ".")}@company.com`;
  switch (cfg.recipientGroup) {
    case "organization":
      return ["all-employees@company.com"];
    case "leadership":
      return ["leadership@company.com", "hr-compliance@company.com"];
    case "managers":
      return managers.map(slug);
    default:
      return cfg.customEmails;
  }
}
