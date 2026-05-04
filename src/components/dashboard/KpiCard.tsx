import { Card } from "@/components/ui/card";
import { trafficLight, lightClasses, type Light } from "@/lib/training-analytics";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  formula: string;
  rate?: number; // 0-100 — if provided, applies traffic light
  invertLight?: boolean; // for "overdue" metrics (lower is better)
  rawCount?: number; // alternative trigger for invertLight
  invertThresholds?: { red: number; yellow: number };
  icon?: React.ReactNode;
}

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
}: KpiCardProps) {
  let light: Light | null = null;
  if (rate !== undefined) light = trafficLight(rate);
  if (invertLight && rawCount !== undefined && invertThresholds) {
    light = rawCount > invertThresholds.red ? "red" : rawCount > invertThresholds.yellow ? "yellow" : "green";
  }
  const lc = light ? lightClasses(light) : null;

  return (
    <Card className="p-5 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        {lc && (
          <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold", lc.bg, lc.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", lc.dot)} />
            {lc.label}
          </span>
        )}
        {icon && !lc && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
      <div className="text-[11px] text-muted-foreground/80 font-mono leading-tight pt-1 border-t border-border/60">
        {formula}
      </div>
    </Card>
  );
}
