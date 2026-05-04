import { Card } from "@/components/ui/card";
import { trafficLight, lightClasses, type Light } from "@/lib/training-analytics";
import { cn } from "@/lib/utils";

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
}: KpiCardProps) {
  let light: Light | null = null;
  if (rate !== undefined) light = trafficLight(rate);
  if (invertLight && rawCount !== undefined && invertThresholds) {
    light = rawCount > invertThresholds.red ? "red" : rawCount > invertThresholds.yellow ? "yellow" : "green";
  }
  const lc = light ? lightClasses(light) : null;

  return (
    <Card className="relative overflow-hidden p-0 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      {/* Top accent strip */}
      <div className={cn("h-1 w-full", toneToStrip[tone])} />

      <div className="p-5 flex flex-col gap-4">
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[2rem] font-bold tracking-tight text-foreground tabular-nums leading-none">
              {value}
            </span>
            {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground/80 font-mono leading-tight pt-3 border-t border-border/60">
          <span className="text-muted-foreground/60">ƒ</span> {formula}
        </div>
      </div>
    </Card>
  );
}
