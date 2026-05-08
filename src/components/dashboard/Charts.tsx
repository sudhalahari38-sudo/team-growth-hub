import { Card } from "@/components/ui/card";
import type { TrainingRecord } from "@/lib/training-types";
import {
  completionByCategory,
  trafficLight,
  lightClasses,
} from "@/lib/training-analytics";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WaveformTrend } from "./WaveformTrend";

const TARGET = 80;
const MONTHLY_TARGET = 25;
const QUARTERLY_TARGET = MONTHLY_TARGET * 3;

export function CategoryChart({ data }: { data: TrainingRecord[] }) {
  const rows = completionByCategory(data);
  return (
    <Card className="p-6 flex flex-col gap-4 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start gap-3">
        <div className="icon-3d icon-3d-info h-10 w-10 shrink-0">
          <BarChart3 className="h-5 w-5 relative z-10" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight">Completion by Category</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            % of assigned trainings completed — target {TARGET}%
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const lc = lightClasses(trafficLight(r.completionRate));
          const grad =
            r.completionRate >= TARGET
              ? "var(--gradient-success)"
              : r.completionRate >= 60
              ? "var(--gradient-warning)"
              : "var(--gradient-danger)";
          return (
            <div key={r.category}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-foreground">{r.category}</span>
                <span className={cn("font-bold tabular-nums", lc.text)}>{r.completionRate}%</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${r.completionRate}%`, backgroundImage: grad }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${TARGET}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {r.assigned} assigned · {r.completed} completed
              </div>
            </div>
          );
        })}
        {!rows.length && (
          <div className="text-sm text-muted-foreground text-center py-6">No data</div>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/60 pt-2">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" /> &lt;60%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-warning" /> 60–80%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-success" /> ≥80%
        </span>
        <span className="ml-auto">│ = {TARGET}% target</span>
      </div>
    </Card>
  );
}

export function TrendChart({ data }: { data: TrainingRecord[] }) {
  return (
    <Card className="p-6 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <WaveformTrend data={data} />
    </Card>
  );
}
