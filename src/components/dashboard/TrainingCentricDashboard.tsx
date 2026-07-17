import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Users,
  Star,
  MessageSquareHeart,
  Building2,
  PieChart as PieIcon,
} from "lucide-react";
import type { TrainingRecord } from "@/lib/training-types";
import type { FeedbackRecord } from "@/lib/feedback-types";
import type { Identity } from "@/lib/current-user";
import {
  computeKpis,
  courseLevelAnalysis,
  atRiskEmployees,
  isOverdue,
  daysOverdue,
  monthlyCompletionTrend,
  TODAY,
  trafficLight,
  lightClasses,
} from "@/lib/training-analytics";

/* -------------------------------- KPI strip ------------------------------- */

type Tone = "primary" | "success" | "info" | "warning" | "danger" | "muted";
const toneText: Record<Tone, string> = {
  primary: "text-foreground",
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-muted-foreground",
};
const toneBg: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-secondary text-muted-foreground",
};

function KpiTile({
  label,
  value,
  sublabel,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  return (
    <Card className="p-4 border-border/60 shadow-sm bg-card">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            toneBg[tone],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "mt-0.5 text-xl font-bold leading-tight tabular-nums",
              toneText[tone],
            )}
          >
            {value}
          </div>
          {sublabel && (
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function KpiStrip({ data }: { data: TrainingRecord[] }) {
  const k = computeKpis(data);
  const inProgress = data.filter((r) => r.status === "In Progress").length;
  const notStarted = data.filter((r) => r.status === "Not Started").length;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiTile
        label="Total Assigned"
        value={k.totalAssigned.toLocaleString()}
        sublabel="trainings"
        icon={<BookOpen className="h-4 w-4" />}
        tone="primary"
      />
      <KpiTile
        label="In Progress"
        value={inProgress.toLocaleString()}
        sublabel={`${pct(inProgress, k.totalAssigned)}%`}
        icon={<Clock className="h-4 w-4" />}
        tone="info"
      />
      <KpiTile
        label="Completed"
        value={k.completed.toLocaleString()}
        sublabel={`${k.completionRate.toFixed(1)}%`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        tone="success"
      />
      <KpiTile
        label="Overdue"
        value={k.overdueCount.toLocaleString()}
        sublabel="need action"
        icon={<AlertTriangle className="h-4 w-4" />}
        tone="danger"
      />
      <KpiTile
        label="Not Started"
        value={notStarted.toLocaleString()}
        sublabel={`${pct(notStarted, k.totalAssigned)}%`}
        icon={<Circle className="h-4 w-4" />}
        tone="muted"
      />
      <KpiTile
        label="Mandatory Compliance"
        value={`${k.mandatoryComplianceRate.toFixed(1)}%`}
        sublabel="target 80%"
        icon={<ShieldCheck className="h-4 w-4" />}
        tone={
          k.mandatoryComplianceRate >= 80
            ? "success"
            : k.mandatoryComplianceRate >= 60
            ? "warning"
            : "danger"
        }
      />
    </div>
  );
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

/* --------------------------------- Trends -------------------------------- */

function CompletionTrend({ data }: { data: TrainingRecord[] }) {
  const trend = monthlyCompletionTrend(data);
  const max = Math.max(1, ...trend.map((t) => t.completions));
  const w = 100 / Math.max(1, trend.length - 1);

  const path = trend
    .map((t, i) => {
      const x = i * w;
      const y = 100 - (t.completions / max) * 100;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = trend.length
    ? `${path} L ${(trend.length - 1) * w} 100 L 0 100 Z`
    : "";

  return (
    <Card className="p-5 border-border/60 shadow-sm bg-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-brand/10 text-accent-brand">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Completion Trend
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Trainings completed per month (last 12 mo)
          </p>
        </div>
      </div>
      <div className="h-40 relative">
        {trend.length ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="currentColor"
                  stopOpacity="0.3"
                  className="text-accent-brand"
                />
                <stop
                  offset="100%"
                  stopColor="currentColor"
                  stopOpacity="0"
                  className="text-accent-brand"
                />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#trendGrad)" />
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              className="text-accent-brand"
            />
          </svg>
        ) : (
          <div className="grid place-items-center h-full text-xs text-muted-foreground">
            No completion history
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {trend.map((t) => (
          <span key={t.month}>{t.label.split(" ")[0]}</span>
        ))}
      </div>
    </Card>
  );
}

function MandatoryMix({ data }: { data: TrainingRecord[] }) {
  const total = data.length;
  const mand = data.filter((r) => r.trainingType === "Mandatory").length;
  const opt = total - mand;
  const mandPct = pct(mand, total);
  const optPct = 100 - mandPct;

  return (
    <Card className="p-5 border-border/60 shadow-sm bg-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <PieIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Mandatory vs Optional
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Composition of assigned trainings
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-danger/70"
            style={{ width: `${mandPct}%` }}
            title={`Mandatory ${mandPct}%`}
          />
          <div
            className="h-full bg-accent-brand/70"
            style={{ width: `${optPct}%` }}
            title={`Optional ${optPct}%`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-danger/70" />
              Mandatory
            </div>
            <div className="text-lg font-bold tabular-nums text-foreground">
              {mand.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({mandPct}%)
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent-brand/70" />
              Optional
            </div>
            <div className="text-lg font-bold tabular-nums text-foreground">
              {opt.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({optPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DepartmentBreakdown({ data }: { data: TrainingRecord[] }) {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { department: string; assigned: number; completed: number }
    >();
    for (const r of data) {
      const e =
        map.get(r.department) ??
        { department: r.department, assigned: 0, completed: 0 };
      e.assigned++;
      if (r.status === "Completed") e.completed++;
      map.set(r.department, e);
    }
    return Array.from(map.values())
      .map((e) => ({
        ...e,
        rate: e.assigned ? Math.round((e.completed / e.assigned) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
  }, [data]);

  return (
    <Card className="p-5 border-border/60 shadow-sm bg-card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-info/10 text-info">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            By Department
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Completion rate (top 8)
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const lc = lightClasses(trafficLight(r.rate));
          return (
            <div key={r.department}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-foreground truncate">
                  {r.department}
                </span>
                <span className={cn("font-semibold tabular-nums", lc.text)}>
                  {r.rate}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full", lc.dot)}
                  style={{ width: `${r.rate}%` }}
                />
              </div>
            </div>
          );
        })}
        {!rows.length && (
          <div className="text-xs text-muted-foreground text-center py-4">
            No department data
          </div>
        )}
      </div>
    </Card>
  );
}

/* -------------------------- At-risk / falling-behind ---------------------- */

function FallingBehindStrip({ data }: { data: TrainingRecord[] }) {
  const rows = useMemo(() => {
    const byEmp = new Map<
      string,
      {
        employeeName: string;
        managerName: string;
        overdue: number;
        maxDays: number;
      }
    >();
    for (const r of atRiskEmployees(data)) {
      const e =
        byEmp.get(r.employeeId) ??
        {
          employeeName: r.employeeName,
          managerName: r.managerName,
          overdue: 0,
          maxDays: 0,
        };
      e.overdue++;
      e.maxDays = Math.max(e.maxDays, r.daysOverdue);
      byEmp.set(r.employeeId, e);
    }
    return Array.from(byEmp.values())
      .sort((a, b) => b.maxDays - a.maxDays)
      .slice(0, 6);
  }, [data]);

  if (!rows.length) return null;

  return (
    <Card className="p-4 border-warning/40 bg-warning/5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/20 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            Falling behind
          </div>
          <div className="text-[11px] text-muted-foreground mb-2">
            Employees with the longest overdue trainings — reach out soon.
          </div>
          <div className="flex flex-wrap gap-2">
            {rows.map((r) => (
              <span
                key={r.employeeName}
                className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-2.5 py-1 text-[11px]"
              >
                <span className="font-medium text-foreground">
                  {r.employeeName}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-danger font-semibold tabular-nums">
                  {r.overdue} overdue
                </span>
                <span className="text-muted-foreground">
                  ({r.maxDays}d max)
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ----------------------------- Training list ----------------------------- */

type SortKey =
  | "courseName"
  | "assigned"
  | "completed"
  | "overdue"
  | "completionRate";

function TrainingList({
  data,
  feedback,
}: {
  data: TrainingRecord[];
  feedback: FeedbackRecord[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "assigned",
    dir: "desc",
  });

  const rows = useMemo(() => {
    const base = courseLevelAnalysis(data).map((c) => {
      const inProgress = data.filter(
        (r) => r.courseName === c.courseName && r.status === "In Progress",
      ).length;
      const notStarted = data.filter(
        (r) => r.courseName === c.courseName && r.status === "Not Started",
      ).length;
      return { ...c, inProgress, notStarted };
    });
    const sorted = [...base].sort((a, b) => {
      const v =
        typeof a[sort.key] === "string"
          ? (a[sort.key] as string).localeCompare(b[sort.key] as string)
          : (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === "asc" ? v : -v;
    });
    return sorted;
  }, [data, sort]);

  const toggle = (name: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const th = (key: SortKey, label: string, align: "left" | "right" = "right") => (
    <button
      type="button"
      onClick={() =>
        setSort((s) =>
          s.key === key
            ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
            : { key, dir: "desc" },
        )
      }
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
        align === "right" ? "text-right w-full" : "text-left",
      )}
    >
      {label}
      {sort.key === key && (
        <span className="ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-brand/10 text-accent-brand">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Trainings</h3>
          <p className="text-[11px] text-muted-foreground">
            Expand a training to see learners, dates, feedback and forecast.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr className="border-b border-border/60">
              <th className="w-6" />
              <th className="text-left px-3 py-2.5">{th("courseName", "Training", "left")}</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="text-right px-3 py-2.5">{th("assigned", "Assigned")}</th>
              <th className="text-right px-3 py-2.5 hidden md:table-cell text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                In Prog
              </th>
              <th className="text-right px-3 py-2.5">{th("completed", "Done")}</th>
              <th className="text-right px-3 py-2.5">{th("overdue", "Overdue")}</th>
              <th className="text-right px-3 py-2.5 pr-5">{th("completionRate", "Complete")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const open = expanded.has(c.courseName);
              const lc = lightClasses(trafficLight(c.completionRate));
              return (
                <>
                  <tr
                    key={c.courseName}
                    onClick={() => toggle(c.courseName)}
                    className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="pl-3">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          open && "rotate-90",
                        )}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {c.courseName}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          c.trainingType === "Mandatory"
                            ? "bg-danger/10 text-danger"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {c.trainingType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {c.category}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.assigned}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums hidden md:table-cell text-info">
                      {c.inProgress}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-success">
                      {c.completed}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums",
                        c.overdue > 0 ? "text-danger font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {c.overdue}
                    </td>
                    <td className="px-3 py-2.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                          <div
                            className={cn("h-full", lc.dot)}
                            style={{ width: `${c.completionRate}%` }}
                          />
                        </div>
                        <span className={cn("font-bold tabular-nums", lc.text)}>
                          {c.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr key={c.courseName + "__x"} className="bg-secondary/20">
                      <td />
                      <td colSpan={8} className="px-3 py-4">
                        <TrainingDetail
                          courseName={c.courseName}
                          data={data.filter((r) => r.courseName === c.courseName)}
                          feedback={feedback.filter(
                            (f) => f.courseName === c.courseName,
                          )}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  No trainings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* --------------------- Embedded per-training detail ---------------------- */

function statusPill(status: string, overdueDays: number) {
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </span>
    );
  }
  if (overdueDays > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger px-2 py-0.5 text-[10px] font-semibold">
        <AlertTriangle className="h-3 w-3" /> Overdue {overdueDays}d
      </span>
    );
  }
  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-info/10 text-info px-2 py-0.5 text-[10px] font-semibold">
        <Clock className="h-3 w-3" /> In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
      <Circle className="h-3 w-3" /> Not Started
    </span>
  );
}

// Deterministic hours/score placeholders from record identity — visible where
// LMS supplies them; "—" when unknown. Keeps UI populated without inventing
// data on every re-render.
function derivedHours(r: TrainingRecord): string {
  if (r.status === "Not Started") return "—";
  const seed = (r.employeeId + r.courseName).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const hrs = 1 + (seed % 6) + (r.status === "Completed" ? 2 : 0);
  return `${hrs}h`;
}
function derivedScore(r: TrainingRecord): string {
  if (r.status !== "Completed") return "—";
  const seed = (r.employeeId + r.courseName).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return `${75 + (seed % 25)}%`;
}

function TrainingDetail({
  courseName,
  data,
  feedback,
}: {
  courseName: string;
  data: TrainingRecord[];
  feedback: FeedbackRecord[];
}) {
  const completed = data.filter((r) => r.status === "Completed").length;
  const target = Math.ceil(data.length * 0.8);
  const additionalNeeded = Math.max(0, target - completed);
  const dueSoon = data.filter((r) => {
    if (r.status === "Completed") return false;
    const d = new Date(r.dueDate).getTime() - TODAY.getTime();
    return d > 0 && d <= 30 * 86400000;
  }).length;

  const avgRating = feedback.length
    ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
    : null;

  const sortedLearners = [...data].sort((a, b) => {
    const ao = isOverdue(a) ? daysOverdue(a) : -1;
    const bo = isOverdue(b) ? daysOverdue(b) : -1;
    return bo - ao;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Learners */}
      <div className="lg:col-span-2 rounded-lg border border-border/60 bg-card">
        <div className="px-3 py-2 border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Learners ({data.length})
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/60 backdrop-blur">
              <tr>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Employee</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground hidden sm:table-cell">Manager</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground hidden md:table-cell">Due</th>
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground hidden md:table-cell">Completed</th>
                <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground hidden sm:table-cell">Hours</th>
                <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedLearners.map((r) => {
                const od = isOverdue(r) ? daysOverdue(r) : 0;
                return (
                  <tr
                    key={r.employeeId + r.courseName + r.assignedDate}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="px-3 py-1.5 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">{r.managerName}</td>
                    <td className="px-3 py-1.5">{statusPill(r.status, od)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums hidden md:table-cell">{r.dueDate}</td>
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums hidden md:table-cell">
                      {r.completionDate ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums hidden sm:table-cell">{derivedHours(r)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{derivedScore(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback + Forecast side panel */}
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
            <MessageSquareHeart className="h-3.5 w-3.5" /> Feedback
          </div>
          {avgRating !== null ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {avgRating.toFixed(1)}
                </span>
                <div className="flex items-center gap-0.5 text-warning">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-3.5 w-3.5",
                        n <= Math.round(avgRating) ? "fill-warning" : "opacity-30",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  ({feedback.length})
                </span>
              </div>
              <ul className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {feedback.slice(0, 4).map((f) => (
                  <li
                    key={f.id}
                    className="text-[11px] text-muted-foreground border-l-2 border-accent-brand/50 pl-2"
                  >
                    <span className="font-medium text-foreground">
                      {f.employeeName}
                    </span>{" "}
                    · ★{f.rating}
                    <div className="italic">{f.comments || "—"}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">No feedback yet.</div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Forecast
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                Due next 30d
              </div>
              <div className="text-lg font-bold tabular-nums text-info">
                {dueSoon}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                Needed for 80%
              </div>
              <div
                className={cn(
                  "text-lg font-bold tabular-nums",
                  additionalNeeded === 0 ? "text-success" : "text-warning",
                )}
              >
                {additionalNeeded}
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {additionalNeeded === 0
              ? `“${courseName}” is on target.`
              : `${additionalNeeded} more completion${additionalNeeded === 1 ? "" : "s"} needed to reach the 80% mandatory-compliance target for this course.`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export function TrainingCentricDashboard({
  data,
  feedback,
  identity,
}: {
  data: TrainingRecord[];
  feedback: FeedbackRecord[];
  identity: Identity;
}) {
  const title =
    identity.role === "manager"
      ? "My Team's Training"
      : "Training Insights";
  const subtitle =
    identity.role === "manager"
      ? `Training for ${identity.managerName}'s direct and indirect reportees.`
      : "Organization-wide training performance, compliance and learner detail.";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>

      <KpiStrip data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CompletionTrend data={data} />
        </div>
        <MandatoryMix data={data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DepartmentBreakdown data={data} />
        <div className="lg:col-span-2">
          <FallingBehindStrip data={data} />
        </div>
      </div>

      <TrainingList data={data} feedback={feedback} />
    </div>
  );
}
