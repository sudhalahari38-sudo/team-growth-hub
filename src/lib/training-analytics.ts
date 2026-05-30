import type { Filters, TrainingRecord } from "./training-types";

export const TODAY = new Date("2026-05-04");

/* ------------------------------ Core helpers ------------------------------ */

export function isOverdue(r: TrainingRecord, today = TODAY): boolean {
  if (r.status === "Completed") return false;
  return new Date(r.dueDate) < today;
}

export function daysOverdue(r: TrainingRecord, today = TODAY): number {
  const diff = today.getTime() - new Date(r.dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function applyFilters(data: TrainingRecord[], f: Filters): TrainingRecord[] {
  return data.filter(
    (r) =>
      (f.manager === "all" || r.managerName === f.manager) &&
      (f.department === "all" || r.department === f.department) &&
      (f.category === "all" || r.courseCategory === f.category) &&
      (f.trainingType === "all" || r.trainingType === f.trainingType) &&
      (f.status === "all" || r.status === f.status) &&
      (f.courseName === "all" || r.courseName === f.courseName),
  );
}

/* --------------------------------- KPIs ---------------------------------- */

export interface Kpis {
  totalAssigned: number;
  completed: number;
  completionRate: number; // 0-100
  overdueCount: number;
  mandatoryComplianceRate: number; // 0-100
}

export function computeKpis(data: TrainingRecord[]): Kpis {
  const totalAssigned = data.length;
  const completed = data.filter((r) => r.status === "Completed").length;
  const overdueCount = data.filter((r) => isOverdue(r)).length;
  const mandatory = data.filter((r) => r.trainingType === "Mandatory");
  const mandatoryDone = mandatory.filter((r) => r.status === "Completed").length;
  return {
    totalAssigned,
    completed,
    completionRate: totalAssigned ? (completed / totalAssigned) * 100 : 0,
    overdueCount,
    mandatoryComplianceRate: mandatory.length ? (mandatoryDone / mandatory.length) * 100 : 0,
  };
}

/* ------------------------------ Aggregations ----------------------------- */

export function completionByCategory(data: TrainingRecord[]) {
  const map = new Map<string, { category: string; assigned: number; completed: number }>();
  for (const r of data) {
    const e = map.get(r.courseCategory) ?? { category: r.courseCategory, assigned: 0, completed: 0 };
    e.assigned++;
    if (r.status === "Completed") e.completed++;
    map.set(r.courseCategory, e);
  }
  return Array.from(map.values()).map((e) => ({
    ...e,
    completionRate: e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0,
  }));
}

export function monthlyCompletionTrend(data: TrainingRecord[]) {
  const map = new Map<string, number>();
  for (const r of data) {
    if (!r.completionDate) continue;
    const key = r.completionDate.slice(0, 7); // yyyy-mm
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  // last 12 months window
  return sorted.slice(-12).map(([month, completions]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    completions,
  }));
}

export function quarterlyCompletionTrend(data: TrainingRecord[]) {
  const map = new Map<string, number>();
  for (const r of data) {
    if (!r.completionDate) continue;
    const d = new Date(r.completionDate);
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    const key = `${d.getUTCFullYear()}-Q${q}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  // last 8 quarters (~2yrs)
  return sorted.slice(-8).map(([key, completions]) => ({
    month: key,
    label: key.slice(2), // yy-Qn
    completions,
  }));
}

export interface ManagerRow {
  manager: string;
  teamSize: number;
  assigned: number;
  completed: number;
  completionRate: number;
  overdueCount: number;
}

export function managerPerformance(data: TrainingRecord[]): ManagerRow[] {
  const map = new Map<string, { manager: string; team: Set<string>; assigned: number; completed: number; overdue: number }>();
  for (const r of data) {
    const e =
      map.get(r.managerName) ??
      { manager: r.managerName, team: new Set<string>(), assigned: 0, completed: 0, overdue: 0 };
    e.team.add(r.employeeId);
    e.assigned++;
    if (r.status === "Completed") e.completed++;
    if (isOverdue(r)) e.overdue++;
    map.set(r.managerName, e);
  }
  return Array.from(map.values())
    .map((e) => ({
      manager: e.manager,
      teamSize: e.team.size,
      assigned: e.assigned,
      completed: e.completed,
      completionRate: e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0,
      overdueCount: e.overdue,
    }))
    .sort((a, b) => a.completionRate - b.completionRate);
}

export interface AtRiskRow {
  employeeName: string;
  employeeId: string;
  managerName: string;
  courseName: string;
  category: string;
  trainingType: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export function atRiskEmployees(data: TrainingRecord[]): AtRiskRow[] {
  return data
    .filter((r) => isOverdue(r))
    .map((r) => ({
      employeeName: r.employeeName,
      employeeId: r.employeeId,
      managerName: r.managerName,
      courseName: r.courseName,
      category: r.courseCategory,
      trainingType: r.trainingType,
      dueDate: r.dueDate,
      daysOverdue: daysOverdue(r),
      status: r.status,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/* ------------------------------ Traffic light ---------------------------- */

export type Light = "red" | "yellow" | "green";

export function trafficLight(rate: number): Light {
  if (rate < 60) return "red";
  if (rate < 80) return "yellow";
  return "green";
}

export function lightClasses(l: Light) {
  if (l === "red") return { bg: "bg-danger/10", text: "text-danger", dot: "bg-danger", label: "At risk" };
  if (l === "yellow") return { bg: "bg-warning/15", text: "text-warning", dot: "bg-warning", label: "Watch" };
  return { bg: "bg-success/10", text: "text-success", dot: "bg-success", label: "On track" };
}

/* -------------------------------- Options -------------------------------- */

export function uniqueOptions(data: TrainingRecord[], key: keyof TrainingRecord): string[] {
  return Array.from(new Set(data.map((r) => String(r[key])).filter(Boolean))).sort();
}

/* -------------------------- Course-level analysis ------------------------ */

export interface CourseRow {
  courseName: string;
  category: string;
  trainingType: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export function courseLevelAnalysis(data: TrainingRecord[]): CourseRow[] {
  const map = new Map<string, CourseRow>();
  for (const r of data) {
    const e =
      map.get(r.courseName) ??
      {
        courseName: r.courseName,
        category: r.courseCategory,
        trainingType: r.trainingType,
        assigned: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
      };
    e.assigned++;
    if (r.status === "Completed") e.completed++;
    if (isOverdue(r)) e.overdue++;
    map.set(r.courseName, e);
  }
  return Array.from(map.values())
    .map((e) => ({ ...e, completionRate: e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0 }))
    .sort((a, b) => b.assigned - a.assigned);
}

/* ----------------------------- Forecast ---------------------------------- */

export function forecast(data: TrainingRecord[]) {
  const totalAssigned = data.length;
  const completed = data.filter((r) => r.status === "Completed").length;
  const overdue = data.filter((r) => isOverdue(r)).length;
  const trend = monthlyCompletionTrend(data);
  const recentAvg =
    trend.slice(-3).reduce((s, t) => s + t.completions, 0) /
    Math.max(1, Math.min(3, trend.length));
  const projectedCompletions = Math.round(recentAvg * 6);
  const projectedRate = totalAssigned
    ? Math.min(100, Math.round(((completed + projectedCompletions) / totalAssigned) * 100))
    : 0;
  const targetCompletions = Math.ceil(totalAssigned * 0.8);
  const additionalNeeded = Math.max(0, targetCompletions - completed);
  const dueSoon = data.filter((r) => {
    if (r.status === "Completed") return false;
    const d = new Date(r.dueDate).getTime() - TODAY.getTime();
    return d > 0 && d <= 30 * 86400000;
  }).length;

  return {
    overdue,
    projectedRate,
    additionalNeeded,
    dueSoon,
    recentMonthlyAvg: Math.round(recentAvg),
  };
}
