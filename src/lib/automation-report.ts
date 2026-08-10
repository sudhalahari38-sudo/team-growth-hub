/**
 * Report rendering for automations: email summary text + CSV attachment.
 */
import type { TrainingRecord } from "./training-types";
import { daysOverdue, isOverdue } from "./training-analytics";
import { REPORT_TYPE_LABELS, type AutomationConfig, type AutomationRun } from "./automation-types";

export interface ReportMetrics extends AutomationRun["metrics"] {}

export function computeReportMetrics(rows: TrainingRecord[]): ReportMetrics {
  const totalAssigned = rows.length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const inProgress = rows.filter((r) => r.status === "In Progress").length;
  const notStarted = rows.filter((r) => r.status === "Not Started").length;
  const overdueRows = rows.filter((r) => isOverdue(r));
  const mandatory = rows.filter((r) => r.trainingType === "Mandatory");
  const mandatoryDone = mandatory.filter((r) => r.status === "Completed").length;
  return {
    totalAssigned,
    completed,
    completionRate: totalAssigned ? (completed / totalAssigned) * 100 : 0,
    overdueCount: overdueRows.length,
    inProgress,
    notStarted,
    mandatoryComplianceRate: mandatory.length ? (mandatoryDone / mandatory.length) * 100 : 0,
    atRiskLearners: new Set(overdueRows.map((r) => r.employeeId)).size,
    outstandingMandatory: mandatory.filter((r) => r.status !== "Completed").length,
  };
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function buildSubject(cfg: AutomationConfig, at: Date) {
  return `[${REPORT_TYPE_LABELS[cfg.reportType]}] ${cfg.name} — ${at.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function buildSummary(
  cfg: AutomationConfig,
  m: ReportMetrics,
  rows: TrainingRecord[],
  periodFrom: string,
  periodTo: string,
): string {
  const byDept = new Map<string, { total: number; done: number }>();
  for (const r of rows) {
    const e = byDept.get(r.department) ?? { total: 0, done: 0 };
    e.total++;
    if (r.status === "Completed") e.done++;
    byDept.set(r.department, e);
  }
  const deptLines = Array.from(byDept.entries())
    .sort((a, b) => a[1].done / a[1].total - b[1].done / b[1].total)
    .slice(0, 8)
    .map(([d, e]) => `  · ${d}: ${pct((e.done / e.total) * 100)} (${e.done}/${e.total})`)
    .join("\n");

  const topOverdue = rows
    .filter((r) => isOverdue(r))
    .sort((a, b) => daysOverdue(b) - daysOverdue(a))
    .slice(0, 5)
    .map((r) => `  · ${r.employeeName} — ${r.courseName} (${daysOverdue(r)}d overdue)`)
    .join("\n");

  return `${REPORT_TYPE_LABELS[cfg.reportType]} report — ${cfg.name}
Data period: ${periodFrom} to ${periodTo}

KEY METRICS
  Total assigned ............ ${m.totalAssigned}
  Completed ................. ${m.completed} (${pct(m.completionRate)})
  In progress ............... ${m.inProgress}
  Not started ............... ${m.notStarted}
  Overdue ................... ${m.overdueCount}
  Employees at risk ......... ${m.atRiskLearners}
  Outstanding mandatory ..... ${m.outstandingMandatory}
  Mandatory compliance ...... ${pct(m.mandatoryComplianceRate)}

COMPLETION BY DEPARTMENT (lowest first)
${deptLines || "  · no data"}

TOP OVERDUE
${topOverdue || "  · none"}

Generated automatically by the L&D compliance automation engine.`;
}

export function buildCsv(rows: TrainingRecord[]): string {
  const head = [
    "Employee ID",
    "Employee",
    "Manager",
    "Department",
    "Course",
    "Category",
    "Type",
    "Assigned",
    "Due",
    "Completed",
    "Status",
    "Days overdue",
  ];
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) =>
    [
      r.employeeId,
      r.employeeName,
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
  return [head.join(","), ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
