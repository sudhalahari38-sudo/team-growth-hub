import { useMemo, useState } from "react";
import type { TrainingRecord } from "@/lib/training-types";
import { Card } from "@/components/ui/card";
import { computeKpis, executiveMetricTrends } from "@/lib/training-analytics";
import { KPI_METRICS, metricSeries, type KpiMetric } from "@/lib/kpi-drilldown";
import { KpiDrilldown } from "./KpiDrilldown";
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Activity,
  UserX,
  Sparkles,
  Timer,
} from "lucide-react";

import { Sparkwave } from "./Sparkwave";
import { KpiTooltip, deltaInfo, formatRefreshed } from "./KpiTooltip";

import { cn } from "@/lib/utils";
import type { MetricPoint } from "@/lib/training-analytics";

type Tone = "primary" | "success" | "info" | "danger" | "warning";

const toneStrip: Record<Tone, string> = {
  primary: "bg-gradient-hero",
  success: "bg-gradient-success",
  info: "bg-gradient-info",
  danger: "bg-gradient-danger",
  warning: "bg-gradient-warning",
};
const toneIcon: Record<Tone, string> = {
  primary: "icon-3d",
  success: "icon-3d icon-3d-success",
  info: "icon-3d icon-3d-info",
  danger: "icon-3d icon-3d-danger",
  warning: "icon-3d icon-3d-warning",
};
const toneText: Record<Tone, string> = {
  primary: "text-foreground",
  success: "text-success",
  info: "text-info",
  danger: "text-danger",
  warning: "text-warning",
};

function WaveRow({
  id,
  label,
  value,
  sublabel,
  icon,
  tone,
  warning,
  trend,
  target,
  formatValue,
  definition,
  formula,
  action,
  unit = "",
  onOpen,
}: {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  tone: Tone;
  warning?: string;
  trend: MetricPoint[];
  target?: number;
  formatValue?: (v: number) => string;
  definition: string;
  formula: string;
  action?: string;
  unit?: string;
  onOpen?: () => void;
}) {
  const first = trend[0]?.value ?? 0;
  const last = trend[trend.length - 1]?.value ?? 0;
  const delta = last - first;
  const deltaPct = first ? (delta / first) * 100 : 0;
  const up = delta >= 0;
  const positiveIsGood = tone !== "danger";
  const good = positiveIsGood ? up : !up;

  const prev = trend[trend.length - 2]?.value ?? first;
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());
  const d = deltaInfo(last, prev, positiveIsGood, unit);

  const values = trend.map((p) => p.value);
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const bestMonth = trend.find((p) => p.value === (positiveIsGood ? max : min))?.label ?? "—";
  const worstMonth = trend.find((p) => p.value === (positiveIsGood ? min : max))?.label ?? "—";
  const vsAvg = avg ? ((last - avg) / Math.abs(avg)) * 100 : 0;

  const stats = [
    { label: "12-mo average", value: fmt(avg) },
    { label: "vs average", value: `${vsAvg >= 0 ? "+" : ""}${vsAvg.toFixed(1)}%` },
    { label: "12-mo high", value: fmt(max) },
    { label: "12-mo low", value: fmt(min) },
    { label: positiveIsGood ? "Best month" : "Lowest month", value: bestMonth },
    { label: positiveIsGood ? "Weakest month" : "Peak month", value: worstMonth },
    ...(target !== undefined
      ? [
          { label: "Target", value: fmt(target) },
          {
            label: last >= target ? "Above target by" : "Gap to target",
            value: fmt(Math.abs(last - target)),
          },
        ]
      : [{ label: "Change vs 12 mo ago", value: `${up ? "+" : ""}${deltaPct.toFixed(1)}%` }]),
  ];

  return (
    <KpiTooltip
      onActivate={onOpen}
      className={onOpen ? "cursor-pointer" : undefined}
      info={{
        title: label,
        definition,
        current: value,
        previous: `${fmt(prev)} (previous month)`,
        ...d,
        stats,
        lastUpdated: formatRefreshed(),
        action,
      }}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card hover:shadow-sm transition-shadow">
        <div className={cn("absolute inset-y-0 left-0 w-1", toneStrip[tone])} />
        <div className="pl-4 pr-3 py-3 grid grid-cols-12 items-center gap-3">
          <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
            <div className={cn(toneIcon[tone], "h-9 w-9 shrink-0")}>
              <span className="relative z-10 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground truncate">
                {label}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={cn("text-lg font-bold tabular-nums leading-none", toneText[tone])}
                >
                  {value}
                </span>
                {sublabel && (
                  <span className="text-[10px] text-muted-foreground truncate">{sublabel}</span>
                )}
              </div>
              {warning ? (
                <div className="mt-1 text-[10px] font-semibold text-warning truncate">{warning}</div>
              ) : (
                <div
                  className={cn(
                    "mt-1 text-[10px] font-semibold tabular-nums",
                    good ? "text-success" : "text-danger",
                  )}
                >
                  {up ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1)}% vs 12 mo ago
                </div>
              )}
            </div>
          </div>
          <div className="col-span-12 sm:col-span-7 h-16">
            <Sparkwave
              data={trend}
              tone={tone}
              target={target}
              formatValue={formatValue}
              gradientId={`spark-${id}`}
            />
          </div>
        </div>
      </div>
    </KpiTooltip>
  );
}


export function ExecutiveSummary({ data }: { data: TrainingRecord[] }) {
  const k = computeKpis(data);
  const t = executiveMetricTrends(data);
  const [drill, setDrill] = useState<KpiMetric | null>(null);

  const optional = KPI_METRICS.optional.value(data);
  const avgDays = KPI_METRICS.avgDays.value(data);
  const atRisk = KPI_METRICS.atRisk.value(data);

  const optionalTrend = useMemo(() => metricSeries(data, "optional"), [data]);
  const avgDaysTrend = useMemo(() => metricSeries(data, "avgDays"), [data]);
  const atRiskTrend = useMemo(() => metricSeries(data, "atRisk"), [data]);

  return (
    <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="icon-3d icon-3d-info h-9 w-9 shrink-0">
            <Activity className="h-4 w-4 relative z-10" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Executive Summary
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              12-month waveforms — hover for detail, click any KPI to drill down
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <WaveRow
          id="assigned"
          label="Total Assigned"
          value={k.totalAssigned.toLocaleString()}
          sublabel="trainings"
          icon={<GraduationCap />}
          tone="primary"
          trend={t.assigned}
          definition="Every training assignment in the current filter scope, regardless of status."
          formula="COUNT(all training assignments in scope)"
          action="Click to view all assignments by course and category."
          onOpen={() => setDrill("assigned")}
        />
        <WaveRow
          id="rate"
          label="Completed / Completion Rate"
          value={`${k.completionRate.toFixed(1)}%`}
          sublabel={`${k.completed.toLocaleString()} of ${k.totalAssigned.toLocaleString()} completed`}
          icon={<CheckCircle2 />}
          tone="success"
          target={80}
          trend={t.completionRate}
          unit="%"
          formatValue={(v) => `${v.toFixed(1)}%`}
          definition="Completed trainings and the share of assigned trainings completed. Target: 80%."
          formula="Completed Assignments ÷ Total Assigned × 100"
          action="Click to drill down into learner details."
          onOpen={() => setDrill("completionRate")}
          warning={
            k.completionRate < 80
              ? `${(80 - k.completionRate).toFixed(1)} pts below 80% target`
              : undefined
          }
        />

        <WaveRow
          id="overdue"
          label="Overdue"
          value={k.overdueCount.toLocaleString()}
          sublabel="needs action"
          icon={<AlertTriangle />}
          tone="danger"
          trend={t.overdue}
          definition="Assignments past their due date that are still not completed."
          formula="COUNT(assignments WHERE due date < today AND status ≠ 'Completed')"
          action="Click to view overdue learners and send nudges."
          onOpen={() => setDrill("overdue")}
          warning={k.overdueCount > 50 ? "Critical volume" : undefined}
        />
        <WaveRow
          id="atRisk"
          label="At-Risk Learners"
          value={atRisk.toLocaleString()}
          sublabel="with overdue training"
          icon={<UserX />}
          tone="danger"
          trend={atRiskTrend}
          definition={KPI_METRICS.atRisk.definition}
          formula={KPI_METRICS.atRisk.formula}
          action="Click to see who to escalate first."
          onOpen={() => setDrill("atRisk")}
        />
        <WaveRow
          id="mandatory"
          label="Mandatory Compliance"
          value={`${k.mandatoryComplianceRate.toFixed(1)}%`}
          sublabel="mandatory trainings"
          icon={<ShieldCheck />}
          tone="warning"
          target={80}
          trend={t.mandatoryCompliance}
          unit="%"
          formatValue={(v) => `${v.toFixed(1)}%`}
          definition="Completion rate limited to Mandatory (compliance) trainings. Target: 80%."
          formula="Completed Mandatory ÷ Total Mandatory Assigned × 100"
          action="Click to view employees with open mandatory training."
          onOpen={() => setDrill("mandatory")}
          warning={
            k.mandatoryComplianceRate < 80
              ? `${(80 - k.mandatoryComplianceRate).toFixed(1)} pts below 80% target`
              : undefined
          }
        />
        <WaveRow
          id="optional"
          label="Optional Completion"
          value={`${optional.toFixed(1)}%`}
          sublabel="development courses"
          icon={<Sparkles />}
          tone="info"
          target={60}
          trend={optionalTrend}
          unit="%"
          formatValue={(v) => `${v.toFixed(1)}%`}
          definition={KPI_METRICS.optional.definition}
          formula={KPI_METRICS.optional.formula}
          action="Click to see optional course uptake by team."
          onOpen={() => setDrill("optional")}
        />
        <WaveRow
          id="avgDays"
          label="Avg Days to Complete"
          value={`${avgDays.toFixed(1)}d`}
          sublabel="assign → complete"
          icon={<Timer />}
          tone="primary"
          trend={avgDaysTrend}
          unit="d"
          formatValue={(v) => `${v.toFixed(1)}d`}
          definition={KPI_METRICS.avgDays.definition}
          formula={KPI_METRICS.avgDays.formula}
          action="Click to find the slowest courses and teams."
          onOpen={() => setDrill("avgDays")}
        />
      </div>

      <KpiDrilldown metric={drill} data={data} onClose={() => setDrill(null)} />
    </Card>
  );
}
