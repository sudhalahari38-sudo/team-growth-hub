import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Download, Bell, AlertTriangle, Search, Users, Building2, Layers } from "lucide-react";
import type { TrainingRecord } from "@/lib/training-types";
import { daysOverdue, isOverdue } from "@/lib/training-analytics";
import {
  KPI_METRICS,
  breakdown,
  downloadCsv,
  metricSeries,
  recordsToCsv,
  type BreakdownDim,
  type KpiMetric,
} from "@/lib/kpi-drilldown";
import { Sparkwave } from "./Sparkwave";
import { NudgeDialog, type NudgeTarget } from "./NudgeDialog";
import { formatRefreshed } from "./KpiTooltip";

const DIMS: { key: BreakdownDim; label: string; icon: React.ReactNode }[] = [
  { key: "department", label: "Department", icon: <Building2 className="h-3.5 w-3.5" /> },
  { key: "managerName", label: "Manager", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "courseCategory", label: "Category", icon: <Layers className="h-3.5 w-3.5" /> },
];

const PAGE = 25;

export function KpiDrilldown({
  metric,
  data,
  onClose,
  canNudge = true,
  sentBy = "Manager",
}: {
  metric: KpiMetric | null;
  data: TrainingRecord[];
  onClose: () => void;
  canNudge?: boolean;
  sentBy?: string;
}) {
  const [dim, setDim] = useState<BreakdownDim>("department");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null);

  const def = metric ? KPI_METRICS[metric] : null;

  const selected = useMemo(() => (def ? def.select(data) : []), [def, data]);
  const series = useMemo(() => (metric ? metricSeries(data, metric) : []), [metric, data]);
  const rows = useMemo(() => breakdown(data, selected, dim), [data, selected, dim]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s
      ? selected.filter(
          (r) =>
            r.employeeName.toLowerCase().includes(s) ||
            r.courseName.toLowerCase().includes(s) ||
            r.managerName.toLowerCase().includes(s) ||
            r.department.toLowerCase().includes(s),
        )
      : selected;
    return [...base].sort((a, b) => daysOverdue(b) - daysOverdue(a));
  }, [selected, q]);

  const priority = useMemo(
    () =>
      selected
        .filter((r) => isOverdue(r))
        .sort((a, b) => daysOverdue(b) - daysOverdue(a))
        .slice(0, 5),
    [selected],
  );

  if (!def || !metric) return null;

  const value = def.format(def.value(data));
  const sparkTone = def.tone === "muted" ? "primary" : def.tone;

  return (
    <>
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          
          className="max-w-none w-screen h-screen sm:max-w-none rounded-none border-0 p-0 gap-0 flex flex-col bg-background"
        >
          <DialogHeader className="px-6 py-4 border-b border-border/60 bg-card text-left space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {def.label} — drill-down
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {def.definition}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1400px] p-6 flex flex-col gap-5">
              {/* Headline + trend */}
              <Card className="p-5 border-border/60 shadow-sm bg-gradient-card">
                <div className="grid grid-cols-12 gap-5 items-center">
                  <div className="col-span-12 lg:col-span-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Current value
                    </div>
                    <div className="mt-1 text-4xl font-bold tabular-nums text-foreground leading-none">
                      {value}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {selected.length.toLocaleString()} contributing records ·{" "}
                      {new Set(selected.map((r) => r.employeeId)).size.toLocaleString()} learners
                    </div>
                    <div className="mt-3 rounded-md bg-secondary/60 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
                      ƒ {def.formula}
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Last updated {formatRefreshed()}
                    </div>
                  </div>
                  <div className="col-span-12 lg:col-span-8 h-40">
                    <Sparkwave
                      data={series}
                      tone={sparkTone}
                      target={def.target}
                      formatValue={def.format}
                      gradientId={`drill-${metric}`}
                    />
                  </div>
                </div>
              </Card>

              {/* Breakdown + priority actions */}
              <div className="grid grid-cols-12 gap-5">
                <Card className="col-span-12 xl:col-span-7 p-5 border-border/60 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Breakdown</h3>
                    <div className="flex items-center gap-1 rounded-lg bg-secondary p-0.5">
                      {DIMS.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setDim(d.key)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                            dim === d.key
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {d.icon}
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {rows.slice(0, 10).map((r) => (
                      <div key={r.name} className="flex items-center gap-3">
                        <div className="w-40 shrink-0 truncate text-[12px] text-foreground">
                          {r.name}
                        </div>
                        <div className="relative h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-hero"
                            style={{ width: `${Math.min(r.share, 100)}%` }}
                          />
                        </div>
                        <div className="w-28 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                          {r.count.toLocaleString()} ({r.share.toFixed(0)}%)
                        </div>
                        <div className="w-24 shrink-0 text-right text-[11px] tabular-nums">
                          <span
                            className={cn(
                              r.rate >= 80
                                ? "text-success"
                                : r.rate >= 60
                                ? "text-warning"
                                : "text-danger",
                            )}
                          >
                            {r.rate.toFixed(0)}% compl.
                          </span>
                        </div>
                      </div>
                    ))}
                    {rows.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">No contributing records.</p>
                    )}
                  </div>
                </Card>

                <Card className="col-span-12 xl:col-span-5 p-5 border-border/60 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Recommended actions
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-3">{def.action}</p>

                  {priority.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      No overdue items in this metric — keep the current cadence.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {priority.map((r, i) => (
                        <div
                          key={`${r.employeeId}-${r.courseName}-${i}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-foreground truncate">
                              {r.employeeName}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {r.courseName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 text-danger px-2 py-0.5 text-[10px] font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              {daysOverdue(r)}d
                            </span>
                            {canNudge && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                onClick={() =>
                                  setNudgeTarget({
                                    employeeId: r.employeeId,
                                    employeeName: r.employeeName,
                                    managerName: r.managerName,
                                    courseName: r.courseName,
                                    dueDate: r.dueDate,
                                    daysOverdue: daysOverdue(r),
                                  })
                                }
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                Nudge
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Records */}
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-border/60">
                  <h3 className="text-sm font-semibold text-foreground">
                    Contributing records
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                      {filtered.length.toLocaleString()} rows
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setLimit(PAGE);
                        }}
                        placeholder="Search learner, course, manager…"
                        className="h-8 w-64 pl-8 text-[12px]"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() =>
                        downloadCsv(`${metric}-drilldown.csv`, recordsToCsv(filtered))
                      }
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-secondary/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="text-left font-semibold px-4 py-2">Learner</th>
                        <th className="text-left font-semibold px-4 py-2">Manager</th>
                        <th className="text-left font-semibold px-4 py-2">Department</th>
                        <th className="text-left font-semibold px-4 py-2">Course</th>
                        <th className="text-left font-semibold px-4 py-2">Type</th>
                        <th className="text-left font-semibold px-4 py-2">Due</th>
                        <th className="text-left font-semibold px-4 py-2">Status</th>
                        <th className="text-right font-semibold px-4 py-2">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, limit).map((r, i) => (
                        <tr
                          key={`${r.employeeId}-${r.courseName}-${i}`}
                          className="border-t border-border/50 hover:bg-secondary/30"
                        >
                          <td className="px-4 py-2 text-foreground">{r.employeeName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.managerName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.department}</td>
                          <td className="px-4 py-2 text-foreground">{r.courseName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.trainingType}</td>
                          <td className="px-4 py-2 tabular-nums text-muted-foreground">
                            {r.dueDate}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                                r.status === "Completed"
                                  ? "bg-success/10 text-success"
                                  : r.status === "In Progress"
                                  ? "bg-info/10 text-info"
                                  : "bg-secondary text-muted-foreground",
                              )}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {isOverdue(r) ? (
                              <span className="text-danger font-semibold">{daysOverdue(r)}d</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No records match this search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {limit < filtered.length && (
                  <div className="flex justify-center border-t border-border/60 bg-secondary/20 px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setLimit(limit + PAGE)}>
                      Show {Math.min(PAGE, filtered.length - limit)} more
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NudgeDialog
        open={!!nudgeTarget}
        onOpenChange={(v) => !v && setNudgeTarget(null)}
        target={nudgeTarget}
        sentBy={sentBy}
      />
    </>
  );
}
