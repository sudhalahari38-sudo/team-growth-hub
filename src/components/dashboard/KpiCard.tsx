import { useState } from "react";
import { Card } from "@/components/ui/card";
import { trafficLight, lightClasses, type Light } from "@/lib/training-analytics";
import { cn } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export type IconTone = "primary" | "brand" | "info" | "success" | "warning" | "danger";

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  formula: string;
  rate?: number; // 0-100 — if provided, applies traffic light
  invertLight?: boolean;
  rawCount?: number;
  invertThresholds?: { red: number; yellow: number };
  icon?: React.ReactNode;
  tone?: IconTone;
  tooltip?: string;
  target?: number; // 0-100 target percent (only when rate provided)
  trend?: string; // "+2.1% vs last month"
  trendDir?: "up" | "down" | "flat";
  warning?: string;
}

const toneToIconClass: Record<IconTone, string> = {
  primary: "icon-3d",
  brand: "icon-3d icon-3d-brand",
  info: "icon-3d icon-3d-info",
  success: "icon-3d icon-3d-success",
  warning: "icon-3d icon-3d-warning",
  danger: "icon-3d icon-3d-danger",
};

const toneToStrip: Record<IconTone, string> = {
  primary: "bg-gradient-hero",
  brand: "bg-gradient-brand",
  info: "bg-gradient-info",
  success: "bg-gradient-success",
  warning: "bg-gradient-warning",
  danger: "bg-gradient-danger",
};

export function KpiCard({
  label,
  value,
  sublabel,
  formula,
  rate,
  invertLight,
  rawCount,
  invertThresholds,
  icon,
  tone = "primary",
  tooltip,
  target,
  trend,
  trendDir,
  warning,
}: KpiCardProps) {
  const [showTip, setShowTip] = useState(false);
  let light: Light | null = null;
  if (rate !== undefined) light = trafficLight(rate);
  if (invertLight && rawCount !== undefined && invertThresholds) {
    light = rawCount > invertThresholds.red ? "red" : rawCount > invertThresholds.yellow ? "yellow" : "green";
  }
  const lc = light ? lightClasses(light) : null;

  const trendColor =
    trendDir === "up" ? "text-success" : trendDir === "down" ? "text-danger" : "text-muted-foreground";
  const trendIcon =
    trendDir === "up" ? <TrendingUp className="h-3 w-3" /> : trendDir === "down" ? <TrendingDown className="h-3 w-3" /> : null;

  const targetBar =
    rate !== undefined && target !== undefined
      ? rate >= target
        ? "var(--gradient-success)"
        : rate >= target * 0.75
        ? "var(--gradient-warning)"
        : "var(--gradient-danger)"
      : null;

  return (
    <Card className="relative overflow-hidden p-0 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className={cn("h-1 w-full", toneToStrip[tone])} />

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className={cn(toneToIconClass[tone], "h-11 w-11")}>
            <span className="relative z-10 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          {lc && (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                lc.bg,
                lc.text,
                light === "red" && "ring-danger/20",
                light === "yellow" && "ring-warning/30",
                light === "green" && "ring-success/20",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", lc.dot)} />
              {lc.label}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </div>
            {tooltip && (
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTip(true)}
                  onMouseLeave={() => setShowTip(false)}
                  onFocus={() => setShowTip(true)}
                  onBlur={() => setShowTip(false)}
                  className="text-muted-foreground/70 hover:text-foreground"
                  aria-label="More info"
                >
                  <Info className="h-3 w-3" />
                </button>
                {showTip && (
                  <div className="absolute z-50 left-4 top-0 w-56 rounded-md bg-foreground text-background text-[11px] leading-snug px-3 py-2 shadow-lg">
                    {tooltip}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[2rem] font-bold tracking-tight text-foreground tabular-nums leading-none">
              {value}
            </span>
            {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
            {trend && (
              <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", trendColor)}>
                {trendIcon}
                {trend}
              </span>
            )}
          </div>
        </div>

        {rate !== undefined && target !== undefined && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progress</span>
              <span>Target: {target}%</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(rate, 100)}%`, backgroundImage: targetBar ?? "" }}
              />
              <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${target}%` }} />
            </div>
          </div>
        )}

        {warning && (
          <div className="inline-flex w-fit items-center gap-1 rounded-md bg-warning/15 text-warning px-2 py-0.5 text-[10px] font-semibold">
            <AlertTriangle className="h-3 w-3" />
            {warning}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground/80 font-mono leading-tight pt-2 border-t border-border/60">
          <span className="text-muted-foreground/60">ƒ</span> {formula}
        </div>
      </div>
    </Card>
  );
}
