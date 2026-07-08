import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TrainingRecord } from "@/lib/training-types";
import {
  computeKpis,
  isOverdue,
  trafficLight,
  lightClasses,
} from "@/lib/training-analytics";
import { Building2, ShieldCheck, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeptRow {
  department: string;
  employees: number;
  assigned: number;
  completed: number;
  overdue: number;
  mandatoryAssigned: number;
  mandatoryCompleted: number;
  completionRate: number;
  complianceRate: number;
}

function byDepartment(data: TrainingRecord[]): DeptRow[] {
  const map = new Map<string, DeptRow & { employeeSet: Set<string> }>();
  for (const r of data) {
    const e =
      map.get(r.department) ??
      ({
        department: r.department,
        employees: 0,
        assigned: 0,
        completed: 0,
        overdue: 0,
        mandatoryAssigned: 0,
        mandatoryCompleted: 0,
        completionRate: 0,
        complianceRate: 0,
        employeeSet: new Set<string>(),
      } as DeptRow & { employeeSet: Set<string> });
    e.employeeSet.add(r.employeeId);
    e.assigned++;
    if (r.status === "Completed") e.completed++;
    if (isOverdue(r)) e.overdue++;
    if (r.trainingType === "Mandatory") {
      e.mandatoryAssigned++;
      if (r.status === "Completed") e.mandatoryCompleted++;
    }
    map.set(r.department, e);
  }
  return Array.from(map.values())
    .map((e) => ({
      department: e.department,
      employees: e.employeeSet.size,
      assigned: e.assigned,
      completed: e.completed,
      overdue: e.overdue,
      mandatoryAssigned: e.mandatoryAssigned,
      mandatoryCompleted: e.mandatoryCompleted,
      completionRate: e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0,
      complianceRate: e.mandatoryAssigned
        ? Math.round((e.mandatoryCompleted / e.mandatoryAssigned) * 100)
        : 0,
    }))
    .sort((a, b) => a.completionRate - b.completionRate);
}

export function LeadershipDashboard({
  data,
  onDrillDepartment,
}: {
  data: TrainingRecord[];
  onDrillDepartment?: (dept: string) => void;
}) {
  const kpis = computeKpis(data);
  const depts = byDepartment(data);
  const employees = new Set(data.map((r) => r.employeeId)).size;
  const overallLight = lightClasses(trafficLight(kpis.completionRate));
  const complianceLight = lightClasses(trafficLight(kpis.mandatoryComplianceRate));

  return (
    <div className="flex flex-col gap-5">
      {/* Org KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OrgKpi
          icon={<Building2 className="h-4 w-4" />}
          label="Organization"
          value={`${employees.toLocaleString()} people`}
          hint={`${depts.length} departments · ${kpis.totalAssigned.toLocaleString()} assignments`}
        />
        <OrgKpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Overall Completion"
          value={`${Math.round(kpis.completionRate)}%`}
          valueClass={overallLight.text}
          hint={`${kpis.completed.toLocaleString()} completed`}
        />
        <OrgKpi
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Mandatory Compliance"
          value={`${Math.round(kpis.mandatoryComplianceRate)}%`}
          valueClass={complianceLight.text}
          hint="Compliance-critical courses"
        />
        <OrgKpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Overdue Trainings"
          value={kpis.overdueCount.toLocaleString()}
          valueClass={kpis.overdueCount > 0 ? "text-danger" : "text-success"}
          hint="Across all departments"
        />
      </section>

      {/* Department table */}
      <Card className="p-0 overflow-hidden border-border/70 shadow-sm">
        <div className="p-5 border-b border-border/70 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Department Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completion, compliance and overdue by department · click a row to drill down
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-2.5">Department</th>
                <th className="text-right px-4 py-2.5">Employees</th>
                <th className="text-right px-4 py-2.5">Assigned</th>
                <th className="text-right px-4 py-2.5">Completed</th>
                <th className="text-right px-4 py-2.5">Overdue</th>
                <th className="text-right px-4 py-2.5">Compliance</th>
                <th className="text-right px-4 py-2.5">Completion</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {depts.map((d) => {
                const cl = lightClasses(trafficLight(d.completionRate));
                const compl = lightClasses(trafficLight(d.complianceRate));
                return (
                  <tr
                    key={d.department}
                    className={cn(
                      "border-t border-border/60 hover:bg-muted/30 transition-colors",
                      onDrillDepartment && "cursor-pointer",
                    )}
                    onClick={() => onDrillDepartment?.(d.department)}
                  >
                    <td className="px-5 py-3 font-medium">{d.department}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.employees}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.assigned}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.completed}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums font-medium",
                        d.overdue > 0 ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {d.overdue}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          compl.bg,
                          compl.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", compl.dot)} />
                        {d.complianceRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          cl.bg,
                          cl.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", cl.dot)} />
                        {d.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onDrillDepartment && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDrillDepartment(d.department);
                          }}
                        >
                          View <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {depts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground text-sm">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OrgKpi({
  icon,
  label,
  value,
  valueClass,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <Card className="p-4 border-border/70 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary/80">{icon}</span>
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums leading-tight mt-2", valueClass)}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}
