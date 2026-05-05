import { Card } from "@/components/ui/card";
import type { TrainingRecord } from "@/lib/training-types";
import { forecast, computeKpis } from "@/lib/training-analytics";
import { AlertTriangle, TrendingDown, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ForecastTab({ data }: { data: TrainingRecord[] }) {
  const f = forecast(data);
  const kpis = computeKpis(data);

  const scenarios = [
    {
      scenario: "No action",
      projected: f.projectedRate,
      effort: "None" as const,
    },
    {
      scenario: "Send reminders to all overdue employees",
      projected: Math.min(100, f.projectedRate + 6),
      effort: "Low" as const,
    },
    {
      scenario: "Manager-led team sessions for bottom 3 managers",
      projected: Math.min(100, f.projectedRate + 10),
      effort: "Medium" as const,
    },
    {
      scenario: "Mandatory completion blocks + manager accountability",
      projected: Math.min(100, f.projectedRate + 17),
      effort: "High" as const,
    },
  ];

  const kpiCards = [
    {
      label: "Due in next 30 days",
      value: f.dueSoon,
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "danger" as const,
    },
    {
      label: "Projected rate (no intervention)",
      value: `${f.projectedRate}%`,
      icon: <TrendingDown className="h-5 w-5" />,
      tone: "warning" as const,
    },
    {
      label: "Completions needed for 80% target",
      value: f.additionalNeeded,
      icon: <Target className="h-5 w-5" />,
      tone: "info" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="icon-3d icon-3d-warning h-10 w-10">
          <Sparkles className="h-5 w-5 relative z-10" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Compliance Forecast</h2>
          <p className="text-xs text-muted-foreground">
            Projection based on the trailing 3-month completion pace ({f.recentMonthlyAvg}/mo)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((c) => (
          <Card
            key={c.label}
            className="p-5 text-center border-border/70 shadow-sm bg-gradient-card flex flex-col items-center gap-2"
          >
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                c.tone === "danger" && "bg-danger/10 text-danger",
                c.tone === "warning" && "bg-warning/15 text-warning",
                c.tone === "info" && "bg-info/10 text-info",
              )}
            >
              {c.icon}
            </div>
            <div
              className={cn(
                "text-3xl font-bold tabular-nums",
                c.tone === "danger" && "text-danger",
                c.tone === "warning" && "text-warning",
                c.tone === "info" && "text-info",
              )}
            >
              {c.value}
            </div>
            <div className="text-xs text-muted-foreground leading-snug max-w-[200px]">
              {c.label}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 border-border/70 shadow-sm bg-gradient-card">
        <h3 className="font-semibold mb-1">30-Day Intervention Scenarios</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Current rate: <span className="font-semibold text-foreground">{kpis.completionRate.toFixed(1)}%</span>
        </p>
        <div className="flex flex-col gap-2.5">
          {scenarios.map((s) => {
            const effortClass =
              s.effort === "None"
                ? "bg-secondary text-muted-foreground"
                : s.effort === "Low"
                ? "bg-success/10 text-success"
                : s.effort === "Medium"
                ? "bg-warning/15 text-warning"
                : "bg-danger/10 text-danger";
            const barGrad =
              s.projected >= 80
                ? "var(--gradient-success)"
                : s.projected >= 70
                ? "var(--gradient-warning)"
                : "var(--gradient-danger)";
            return (
              <div
                key={s.scenario}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition"
              >
                <div className="flex-1 text-xs font-semibold text-foreground">{s.scenario}</div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", effortClass)}>
                  {s.effort} effort
                </span>
                <div className="w-32 sm:w-44 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.projected}%`, backgroundImage: barGrad }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right">
                    {s.projected}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
