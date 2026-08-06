import type { TrainingRecord } from "@/lib/training-types";
import { atRiskEmployees, managerPerformance, TODAY } from "@/lib/training-analytics";
import { Rocket, ArrowRight, AlertTriangle, ShieldAlert, CalendarClock } from "lucide-react";

interface Props {
  data: TrainingRecord[];
  onViewCritical: () => void;
  onDrillBottomManager: (manager: string) => void;
}

/**
 * Deliberately minimal: only the highest-priority, action-ready signals.
 * No generated prose — everything below is derived directly from the data.
 */
export function RecommendedActions({ data, onViewCritical, onDrillBottomManager }: Props) {
  const risk = atRiskEmployees(data);
  const critical = risk.filter((r) => r.daysOverdue >= 30).length;

  const overdueMandatory = data.filter(
    (r) =>
      r.trainingType === "Mandatory" &&
      r.status !== "Completed" &&
      new Date(r.dueDate).getTime() < TODAY.getTime(),
  ).length;

  const expiring = data.filter((r) => {
    if (r.trainingType !== "Mandatory" || r.status === "Completed") return false;
    const diff = new Date(r.dueDate).getTime() - TODAY.getTime();
    return diff >= 0 && diff <= 30 * 86400000;
  }).length;

  const bottom = managerPerformance(data)[0];

  const items = [
    {
      key: "mandatory",
      icon: <ShieldAlert className="h-4 w-4" />,
      label: "Overdue mandatory training",
      value: overdueMandatory,
      hint: "Compliance exposure — nudge learners now",
      tone: "danger" as const,
      onClick: onViewCritical,
      cta: "Review",
    },
    {
      key: "expiring",
      icon: <CalendarClock className="h-4 w-4" />,
      label: "Certifications expiring in 30 days",
      value: expiring,
      hint: "Schedule sessions before due dates",
      tone: "warning" as const,
      onClick: onViewCritical,
      cta: "Plan",
    },
    {
      key: "critical",
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Learners 30+ days overdue",
      value: critical,
      hint: bottom ? `Weakest team: ${bottom.manager} (${bottom.completionRate}%)` : "",
      tone: "danger" as const,
      onClick: bottom ? () => onDrillBottomManager(bottom.manager) : onViewCritical,
      cta: bottom ? "Drill down" : "Review",
    },
  ].filter((i) => i.value > 0);

  return (
    <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-lg relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-accent-brand/30 blur-3xl" />

      <div className="relative flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-accent-brand/30 ring-1 ring-inset ring-primary-foreground/20 flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold">Priority Actions</div>
          <div className="text-[11px] text-primary-foreground/70">
            Top compliance risks needing attention today
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="relative text-xs text-primary-foreground/70">
          No high-priority risks. Mandatory training is on track.
        </div>
      ) : (
        <ul className="relative flex flex-col gap-2.5">
          {items.map((i) => (
            <li key={i.key}>
              <button
                type="button"
                onClick={i.onClick}
                className="w-full flex items-center gap-3 rounded-xl bg-primary-foreground/5 ring-1 ring-inset ring-primary-foreground/10 px-3 py-2.5 text-left hover:bg-primary-foreground/10 transition"
              >
                <span
                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                    i.tone === "danger" ? "bg-danger/25" : "bg-warning/25"
                  }`}
                >
                  {i.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold truncate">{i.label}</span>
                  {i.hint && (
                    <span className="block text-[11px] text-primary-foreground/60 truncate">
                      {i.hint}
                    </span>
                  )}
                </span>
                <span className="text-xl font-bold tabular-nums">{i.value}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-foreground/80 shrink-0">
                  {i.cta} <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
