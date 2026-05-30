import type { TrainingRecord } from "@/lib/training-types";
import { Card } from "@/components/ui/card";
import { computeKpis, executiveMetricTrends } from "@/lib/training-analytics";
import {
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Sparkwave } from "./Sparkwave";
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
}) {
  const first = trend[0]?.value ?? 0;
  const last = trend[trend.length - 1]?.value ?? 0;
  const delta = last - first;
  const deltaPct = first ? (delta / first) * 100 : 0;
  const up = delta >= 0;
  const positiveIsGood = tone !== "danger";
  const good = positiveIsGood ? up : !up;

  return (
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
  );
}

export function ExecutiveSummary({ data }: { data: TrainingRecord[] }) {
  const k = computeKpis(data);
  const t = executiveMetricTrends(data);

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
              Key metrics shown as 12-month waveforms — trend & current value at a glance
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
        />
        <WaveRow
          id="completed"
          label="Completed"
          value={k.completed.toLocaleString()}
          sublabel={`of ${k.totalAssigned.toLocaleString()}`}
          icon={<CheckCircle2 />}
          tone="success"
          trend={t.completed}
        />
        <WaveRow
          id="rate"
          label="Completion Rate"
          value={`${k.completionRate.toFixed(1)}%`}
          icon={<TrendingUp />}
          tone="info"
          target={80}
          trend={t.completionRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
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
          warning={k.overdueCount > 50 ? "Critical volume" : undefined}
        />
        <WaveRow
          id="mandatory"
          label="Mandatory Compliance"
          value={`${k.mandatoryComplianceRate.toFixed(1)}%`}
          icon={<ShieldCheck />}
          tone="warning"
          target={80}
          trend={t.mandatoryCompliance}
          formatValue={(v) => `${v.toFixed(1)}%`}
          warning={
            k.mandatoryComplianceRate < 80
              ? `${(80 - k.mandatoryComplianceRate).toFixed(1)} pts below 80% target`
              : undefined
          }
        />
      </div>
    </Card>
  );
}
