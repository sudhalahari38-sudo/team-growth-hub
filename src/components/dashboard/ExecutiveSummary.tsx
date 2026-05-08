import type { TrainingRecord } from "@/lib/training-types";
import { Card } from "@/components/ui/card";
import { computeKpis } from "@/lib/training-analytics";
import {
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { WaveformTrend } from "./WaveformTrend";
import { cn } from "@/lib/utils";

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

function MiniBox({
  label,
  value,
  sublabel,
  icon,
  tone,
  warning,
  rate,
  target,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  tone: Tone;
  warning?: string;
  rate?: number;
  target?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card hover:shadow-sm transition-shadow">
      <div className={cn("absolute inset-y-0 left-0 w-1", toneStrip[tone])} />
      <div className="pl-4 pr-3 py-3 flex items-center gap-3">
        <div className={cn(toneIcon[tone], "h-9 w-9 shrink-0")}>
          <span className="relative z-10 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground truncate">
            {label}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={cn("text-lg font-bold tabular-nums leading-none", toneText[tone])}>
              {value}
            </span>
            {sublabel && (
              <span className="text-[10px] text-muted-foreground truncate">{sublabel}</span>
            )}
          </div>
          {rate !== undefined && target !== undefined && (
            <div className="relative h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.min(rate, 100)}%`,
                  backgroundImage:
                    rate >= target
                      ? "var(--gradient-success)"
                      : rate >= target * 0.75
                      ? "var(--gradient-warning)"
                      : "var(--gradient-danger)",
                }}
              />
              <div
                className="absolute inset-y-0 w-px bg-foreground/40"
                style={{ left: `${target}%` }}
              />
            </div>
          )}
          {warning && (
            <div className="mt-1 text-[10px] font-semibold text-warning truncate">{warning}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummary({ data }: { data: TrainingRecord[] }) {
  const k = computeKpis(data);
  return (
    <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Executive Summary
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Key metrics with completion waveform — current reporting period
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: stacked metric boxes */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <MiniBox
            label="Total Assigned"
            value={k.totalAssigned.toLocaleString()}
            sublabel="trainings"
            icon={<GraduationCap />}
            tone="primary"
          />
          <MiniBox
            label="Completed"
            value={k.completed.toLocaleString()}
            sublabel={`of ${k.totalAssigned.toLocaleString()}`}
            icon={<CheckCircle2 />}
            tone="success"
          />
          <MiniBox
            label="Completion Rate"
            value={`${k.completionRate.toFixed(1)}%`}
            icon={<TrendingUp />}
            tone="info"
            rate={k.completionRate}
            target={80}
            warning={
              k.completionRate < 80
                ? `${(80 - k.completionRate).toFixed(1)} pts below target`
                : undefined
            }
          />
          <MiniBox
            label="Overdue"
            value={k.overdueCount.toLocaleString()}
            sublabel="needs action"
            icon={<AlertTriangle />}
            tone="danger"
            warning={k.overdueCount > 50 ? "Critical volume" : undefined}
          />
          <MiniBox
            label="Mandatory Compliance"
            value={`${k.mandatoryComplianceRate.toFixed(1)}%`}
            icon={<ShieldCheck />}
            tone="warning"
            rate={k.mandatoryComplianceRate}
            target={80}
            warning={
              k.mandatoryComplianceRate < 80
                ? `${(80 - k.mandatoryComplianceRate).toFixed(1)} pts below target`
                : undefined
            }
          />
        </div>
        {/* Right: waveform */}
        <div className="lg:col-span-7 rounded-xl border border-border/60 bg-card/60 p-4">
          <WaveformTrend data={data} />
        </div>
      </div>
    </Card>
  );
}
