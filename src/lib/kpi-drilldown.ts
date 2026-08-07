import type { TrainingRecord } from "./training-types";
import {
  TODAY,
  daysOverdue,
  isOverdue,
  executiveMetricTrends,
  type MetricPoint,
} from "./training-analytics";

export type KpiMetric =
  | "assigned"
  | "completed"
  | "completionRate"
  | "inProgress"
  | "notStarted"
  | "overdue"
  | "mandatory"
  | "optional"
  | "avgDays"
  | "atRisk";

export type KpiTone = "primary" | "success" | "info" | "danger" | "warning" | "muted";

export interface KpiMetricDef {
  key: KpiMetric;
  label: string;
  definition: string;
  formula: string;
  tone: KpiTone;
  unit?: "%" | "d";
  higherIsBetter: boolean;
  target?: number;
  /** Records that contribute to this metric — the drill-down record set. */
  select: (data: TrainingRecord[]) => TrainingRecord[];
  /** Headline value as a number. */
  value: (data: TrainingRecord[]) => number;
  format: (v: number) => string;
  action: string;
}

const completedOf = (d: TrainingRecord[]) => d.filter((r) => r.status === "Completed");
const rate = (n: number, d: number) => (d ? (n / d) * 100 : 0);

function daysToComplete(r: TrainingRecord): number | null {
  if (!r.completionDate) return null;
  const diff = new Date(r.completionDate).getTime() - new Date(r.assignedDate).getTime();
  return diff >= 0 ? Math.round(diff / 86400000) : null;
}

export function avgDaysToComplete(data: TrainingRecord[]): number {
  const vals = data.map(daysToComplete).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

export function atRiskLearners(data: TrainingRecord[]): number {
  return new Set(data.filter((r) => isOverdue(r)).map((r) => r.employeeId)).size;
}

export const KPI_METRICS: Record<KpiMetric, KpiMetricDef> = {
  assigned: {
    key: "assigned",
    label: "Total Assigned",
    definition: "Every training assignment in the current scope, regardless of status.",
    formula: "COUNT(all training assignments in scope)",
    tone: "primary",
    higherIsBetter: true,
    select: (d) => d,
    value: (d) => d.length,
    format: (v) => Math.round(v).toLocaleString(),
    action: "Review the full assignment book by course, department and manager.",
  },
  completed: {
    key: "completed",
    label: "Completed",
    definition: "Assignments marked Completed in the LMS.",
    formula: "COUNT(assignments WHERE status = 'Completed')",
    tone: "success",
    higherIsBetter: true,
    select: completedOf,
    value: (d) => completedOf(d).length,
    format: (v) => Math.round(v).toLocaleString(),
    action: "See which courses and teams are driving completions.",
  },
  completionRate: {
    key: "completionRate",
    label: "Completed / Completion Rate",
    definition:
      "Completed trainings and the share of assigned trainings completed. Target: 80%.",
    formula: "Completed Assignments ÷ Total Assigned × 100",
    tone: "success",
    unit: "%",
    target: 80,
    higherIsBetter: true,
    select: (d) => d,
    value: (d) => rate(completedOf(d).length, d.length),
    format: (v) => `${v.toFixed(1)}%`,
    action: "Drill into the segments dragging the completion rate down.",
  },
  inProgress: {
    key: "inProgress",
    label: "In Progress",
    definition: "Trainings started but not yet finished by the learner.",
    formula: "COUNT(assignments WHERE status = 'In Progress')",
    tone: "info",
    higherIsBetter: true,
    select: (d) => d.filter((r) => r.status === "In Progress"),
    value: (d) => d.filter((r) => r.status === "In Progress").length,
    format: (v) => Math.round(v).toLocaleString(),
    action: "Nudge learners who are mid-course and close to their due date.",
  },
  notStarted: {
    key: "notStarted",
    label: "Not Started",
    definition: "Assignments the learner has not opened yet.",
    formula: "COUNT(assignments WHERE status = 'Not Started')",
    tone: "muted",
    higherIsBetter: false,
    select: (d) => d.filter((r) => r.status === "Not Started"),
    value: (d) => d.filter((r) => r.status === "Not Started").length,
    format: (v) => Math.round(v).toLocaleString(),
    action: "Kick off the learners who have not begun their training.",
  },
  overdue: {
    key: "overdue",
    label: "Overdue",
    definition: "Assignments past their due date that are still not completed.",
    formula: "COUNT(assignments WHERE due date < today AND status ≠ 'Completed')",
    tone: "danger",
    higherIsBetter: false,
    select: (d) => d.filter((r) => isOverdue(r)),
    value: (d) => d.filter((r) => isOverdue(r)).length,
    format: (v) => Math.round(v).toLocaleString(),
    action: "Send tiered nudges to the most overdue learners first.",
  },
  mandatory: {
    key: "mandatory",
    label: "Mandatory Compliance",
    definition: "Completion rate limited to Mandatory (compliance) trainings. Target: 80%.",
    formula: "Completed Mandatory ÷ Total Mandatory Assigned × 100",
    tone: "warning",
    unit: "%",
    target: 80,
    higherIsBetter: true,
    select: (d) => d.filter((r) => r.trainingType === "Mandatory"),
    value: (d) => {
      const m = d.filter((r) => r.trainingType === "Mandatory");
      return rate(completedOf(m).length, m.length);
    },
    format: (v) => `${v.toFixed(1)}%`,
    action: "Close open mandatory training before the compliance window lapses.",
  },
  optional: {
    key: "optional",
    label: "Optional Completion",
    definition:
      "Completion rate for Optional (development) trainings — a signal of learning appetite.",
    formula: "Completed Optional ÷ Total Optional Assigned × 100",
    tone: "info",
    unit: "%",
    target: 60,
    higherIsBetter: true,
    select: (d) => d.filter((r) => r.trainingType === "Optional"),
    value: (d) => {
      const o = d.filter((r) => r.trainingType === "Optional");
      return rate(completedOf(o).length, o.length);
    },
    format: (v) => `${v.toFixed(1)}%`,
    action: "Promote high-value optional courses with low uptake.",
  },
  avgDays: {
    key: "avgDays",
    label: "Avg Days to Complete",
    definition:
      "Average elapsed days between assignment and completion — how fast training moves.",
    formula: "AVG(completion date − assigned date) for completed assignments",
    tone: "primary",
    unit: "d",
    higherIsBetter: false,
    select: (d) => completedOf(d).filter((r) => daysToComplete(r) !== null),
    value: (d) => avgDaysToComplete(d),
    format: (v) => `${v.toFixed(1)}d`,
    action: "Target the courses with the slowest turnaround.",
  },
  atRisk: {
    key: "atRisk",
    label: "At-Risk Learners",
    definition: "Distinct learners with at least one overdue training assignment.",
    formula: "COUNT(DISTINCT employee WHERE any assignment is overdue)",
    tone: "danger",
    higherIsBetter: false,
    select: (d) => d.filter((r) => isOverdue(r)),
    value: (d) => atRiskLearners(d),
    format: (v) => Math.round(v).toLocaleString(),
    action: "Escalate learners carrying multiple overdue items.",
  },
};

/* ------------------------------ Trend series ----------------------------- */

function monthBuckets(today = TODAY) {
  const out: { label: string; start: Date; end: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i + 1, 0));
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    out.push({
      label: start.toLocaleDateString("en-US", { month: "short" }),
      start,
      end,
    });
  }
  return out;
}

export function metricSeries(data: TrainingRecord[], key: KpiMetric): MetricPoint[] {
  const t = executiveMetricTrends(data);
  if (key === "assigned") return t.assigned;
  if (key === "completed") return t.completed;
  if (key === "completionRate") return t.completionRate;
  if (key === "overdue") return t.overdue;
  if (key === "mandatory") return t.mandatoryCompliance;

  return monthBuckets().map((m) => {
    if (key === "optional") {
      const o = data.filter(
        (r) => r.trainingType === "Optional" && new Date(r.assignedDate) <= m.end,
      );
      const done = o.filter((r) => r.completionDate && new Date(r.completionDate) <= m.end);
      return { label: m.label, value: rate(done.length, o.length) };
    }
    if (key === "avgDays") {
      const inMonth = data.filter((r) => {
        if (!r.completionDate) return false;
        const cd = new Date(r.completionDate);
        return cd >= m.start && cd <= m.end;
      });
      return { label: m.label, value: avgDaysToComplete(inMonth) };
    }
    if (key === "atRisk") {
      const ids = new Set(
        data
          .filter((r) => {
            const due = new Date(r.dueDate);
            if (due > m.end) return false;
            if (!r.completionDate) return true;
            return new Date(r.completionDate) > due;
          })
          .map((r) => r.employeeId),
      );
      return { label: m.label, value: ids.size };
    }
    // status-based point-in-time approximations
    const upTo = data.filter((r) => new Date(r.assignedDate) <= m.end);
    if (key === "inProgress") {
      return {
        label: m.label,
        value: upTo.filter(
          (r) => r.status === "In Progress" || (r.completionDate && new Date(r.completionDate) > m.end),
        ).length,
      };
    }
    return {
      label: m.label,
      value: upTo.filter((r) => r.status === "Not Started").length,
    };
  });
}

/* ------------------------------- Breakdowns ------------------------------ */

export interface BreakdownRow {
  name: string;
  count: number;
  total: number;
  share: number; // % of the metric's records
  rate: number; // completion rate within the segment
}

export type BreakdownDim = "department" | "managerName" | "courseCategory" | "courseName";

export function breakdown(
  scope: TrainingRecord[],
  selected: TrainingRecord[],
  dim: BreakdownDim,
): BreakdownRow[] {
  const totals = new Map<string, number>();
  for (const r of scope) totals.set(String(r[dim]), (totals.get(String(r[dim])) ?? 0) + 1);

  const counts = new Map<string, number>();
  for (const r of selected) counts.set(String(r[dim]), (counts.get(String(r[dim])) ?? 0) + 1);

  const denom = selected.length || 1;
  return Array.from(counts.entries())
    .map(([name, count]) => {
      const seg = scope.filter((r) => String(r[dim]) === name);
      return {
        name,
        count,
        total: totals.get(name) ?? 0,
        share: (count / denom) * 100,
        rate: rate(completedOf(seg).length, seg.length),
      };
    })
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------ Record export ---------------------------- */

export function recordsToCsv(rows: TrainingRecord[]): string {
  const head = [
    "Employee",
    "Employee ID",
    "Manager",
    "Department",
    "Course",
    "Category",
    "Type",
    "Assigned",
    "Due",
    "Completed",
    "Status",
    "Days Overdue",
  ];
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.employeeName,
      r.employeeId,
      r.managerName,
      r.department,
      r.courseName,
      r.courseCategory,
      r.trainingType,
      r.assignedDate,
      r.dueDate,
      r.completionDate ?? "",
      r.status,
      isOverdue(r) ? daysOverdue(r) : 0,
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
