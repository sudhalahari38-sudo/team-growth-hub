import { Card } from "@/components/ui/card";
import type { TrainingRecord } from "@/lib/training-types";
import {
  completionByCategory,
  monthlyCompletionTrend,
  quarterlyCompletionTrend,
  trafficLight,
  lightClasses,
} from "@/lib/training-analytics";
import { BarChart3, LineChart as LineIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

type Slice = "month" | "quarter";

export function TrendChart({ data }: { data: TrainingRecord[] }) {
  const [slice, setSlice] = useState<Slice>("month");
  const rows = slice === "month" ? monthlyCompletionTrend(data) : quarterlyCompletionTrend(data);
  const target = slice === "month" ? MONTHLY_TARGET : QUARTERLY_TARGET;
  const max = Math.max(target + 5, ...rows.map((r) => r.completions), 1);
  const lastBucket = rows[rows.length - 1];
  const dipBuckets = rows.filter((r) => r.completions < target).length;
  const sliceLabel = slice === "month" ? "month" : "quarter";
  return (
    <Card className="p-6 flex flex-col gap-4 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-10 w-10 shrink-0">
          <LineIcon className="h-5 w-5 relative z-10" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground tracking-tight">
              {slice === "month" ? "Monthly" : "Quarterly"} Completion Trend
            </h3>
            <div className="inline-flex items-center rounded-md border border-border/70 bg-secondary/40 p-0.5 text-[10px] font-semibold">
              {(["month", "quarter"] as Slice[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlice(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-[5px] transition-all uppercase tracking-wider",
                    slice === s
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "month" ? "Month" : "Quarter"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completions per {sliceLabel} vs. {target}/{sliceLabel.charAt(0)} target
          </p>
        </div>
      </div>

      <div className="relative flex items-end gap-1.5 h-[160px] pt-4">
        {/* target line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-foreground/30"
          style={{ bottom: `${(target / max) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-[10px] text-muted-foreground bg-card px-1">
            Target {target}
          </span>
        </div>
        {rows.map((d) => {
          const h = (d.completions / max) * 100;
          const meets = d.completions >= target;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
              <span
                className={cn(
                  "text-[10px] font-bold tabular-nums",
                  meets ? "text-success" : "text-warning",
                )}
              >
                {d.completions}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-500 min-h-[4px] group-hover:opacity-90"
                style={{
                  height: `${h}%`,
                  backgroundImage: meets ? "var(--gradient-success)" : "var(--gradient-warning)",
                }}
                title={`${d.label}: ${d.completions}`}
              />
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>

      {dipBuckets > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-warning/15 text-warning px-3 py-2 text-[11px] font-medium">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span>
            {dipBuckets} of {rows.length} {sliceLabel}s below the {target}/{sliceLabel.charAt(0)} target
            {lastBucket && lastBucket.completions < target
              ? ` — current ${sliceLabel} pacing at ${lastBucket.completions}.`
              : "."}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/60 pt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Met target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Below target
        </span>
      </div>
    </Card>
  );
}
