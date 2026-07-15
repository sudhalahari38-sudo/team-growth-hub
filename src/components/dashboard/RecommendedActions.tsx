import type { TrainingRecord } from "@/lib/training-types";
import {
  atRiskEmployees,
  managerPerformance,
  computeKpis,
  completionByCategory,
  TODAY,
} from "@/lib/training-analytics";
import {
  Rocket,
  ArrowRight,
  AlertTriangle,
  Users,
  TrendingDown,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

interface Props {
  data: TrainingRecord[];
  onViewCritical: () => void;
  onDrillBottomManager: (manager: string) => void;
}

export function RecommendedActions({ data, onViewCritical, onDrillBottomManager }: Props) {
  const kpis = computeKpis(data);
  const risk = atRiskEmployees(data);
  const critical = risk.filter((r) => r.daysOverdue >= 30).length;
  const critical7 = risk.filter((r) => r.daysOverdue >= 7 && r.daysOverdue < 30).length;
  const mgrs = managerPerformance(data);
  const bottom = mgrs[0];
  const bottomManagers = mgrs.slice(0, 3);
  const topOverdue = risk.slice(0, 4);

  const weakCategories = completionByCategory(data)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 3);

  // Upcoming due in next 14 days (not completed)
  const upcoming = data.filter((r) => {
    if (r.status === "Completed") return false;
    const due = new Date(r.dueDate).getTime();
    const diff = due - TODAY.getTime();
    return diff >= 0 && diff <= 14 * 86400000;
  }).length;

  return (
    <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-lg overflow-hidden relative">
      <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-accent-brand/30 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-accent-brand/20 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="h-10 w-10 rounded-xl bg-accent-brand/30 ring-1 ring-inset ring-primary-foreground/20 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold mb-1">Recommended Actions</div>
            <div className="text-xs text-primary-foreground/80 leading-relaxed">
              AI-prioritized interventions across your organization based on overdue risk, manager
              performance, and category gaps.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {critical > 0 && (
            <button
              type="button"
              onClick={onViewCritical}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger text-danger-foreground px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              View {critical} critical <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {bottom && (
            <button
              type="button"
              onClick={() => onDrillBottomManager(bottom.manager)}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning text-warning-foreground px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              Drill → {bottom.manager.split(" ")[0]} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Signal strip */}
      <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Signal
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Critical (30+ days)"
          value={critical}
          tone="danger"
        />
        <Signal
          icon={<CalendarClock className="h-4 w-4" />}
          label="Overdue 7–29 days"
          value={critical7}
          tone="warning"
        />
        <Signal
          icon={<Users className="h-4 w-4" />}
          label="Due next 14 days"
          value={upcoming}
          tone="info"
        />
        <Signal
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Mandatory compliance"
          value={`${Math.round(kpis.mandatoryComplianceRate)}%`}
          tone={kpis.mandatoryComplianceRate >= 80 ? "success" : "warning"}
        />
      </div>

      {/* Detail grid */}
      <div className="relative mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Top overdue employees */}
        <Panel title="Top overdue learners" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          {topOverdue.length === 0 ? (
            <EmptyLine>No overdue learners 🎉</EmptyLine>
          ) : (
            <ul className="space-y-1.5">
              {topOverdue.map((r) => (
                <li
                  key={`${r.employeeId}-${r.courseName}`}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.employeeName}</div>
                    <div className="text-primary-foreground/60 truncate">{r.courseName}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-danger/25 text-primary-foreground px-1.5 py-0.5 font-bold">
                    {r.daysOverdue}d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Managers needing attention */}
        <Panel title="Managers needing attention" icon={<TrendingDown className="h-3.5 w-3.5" />}>
          {bottomManagers.length === 0 ? (
            <EmptyLine>All managers on track</EmptyLine>
          ) : (
            <ul className="space-y-1.5">
              {bottomManagers.map((m) => (
                <li key={m.manager} className="text-[11px]">
                  <button
                    type="button"
                    onClick={() => onDrillBottomManager(m.manager)}
                    className="w-full flex items-center justify-between gap-2 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-primary-foreground/10 transition text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{m.manager}</div>
                      <div className="text-primary-foreground/60">
                        {m.teamSize} people · {m.overdueCount} overdue
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 font-bold ${
                        m.completionRate < 60
                          ? "bg-danger/25"
                          : m.completionRate < 80
                            ? "bg-warning/25"
                            : "bg-success/25"
                      }`}
                    >
                      {m.completionRate}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Weakest categories */}
        <Panel title="Weakest categories" icon={<TrendingDown className="h-3.5 w-3.5" />}>
          {weakCategories.length === 0 ? (
            <EmptyLine>No category data</EmptyLine>
          ) : (
            <ul className="space-y-2">
              {weakCategories.map((c) => (
                <li key={c.category} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold truncate">{c.category}</span>
                    <span className="text-primary-foreground/80 font-bold">
                      {c.completionRate}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden">
                    <div
                      className={`h-full ${
                        c.completionRate < 60
                          ? "bg-danger"
                          : c.completionRate < 80
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{ width: `${Math.max(4, c.completionRate)}%` }}
                    />
                  </div>
                  <div className="text-primary-foreground/50 mt-0.5">
                    {c.completed}/{c.assigned} completed
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Signal({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "danger" | "warning" | "info" | "success";
}) {
  const toneMap = {
    danger: "bg-danger/20 text-primary-foreground",
    warning: "bg-warning/20 text-primary-foreground",
    info: "bg-accent-brand/25 text-primary-foreground",
    success: "bg-success/25 text-primary-foreground",
  } as const;
  return (
    <div className="rounded-xl bg-primary-foreground/5 ring-1 ring-inset ring-primary-foreground/10 p-3">
      <div className="flex items-center gap-2 text-[11px] text-primary-foreground/70">
        <span
          className={`h-6 w-6 rounded-md flex items-center justify-center ${toneMap[tone]}`}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-primary-foreground/5 ring-1 ring-inset ring-primary-foreground/10 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-primary-foreground/60 font-semibold mb-2">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-primary-foreground/60">{children}</div>;
}
