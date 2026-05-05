import { Card } from "@/components/ui/card";
import type { TrainingRecord } from "@/lib/training-types";
import { courseLevelAnalysis, trafficLight, lightClasses } from "@/lib/training-analytics";
import { BookOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export function CoursesTab({ data }: { data: TrainingRecord[] }) {
  const rows = courseLevelAnalysis(data);
  const struggling = rows.filter((r) => r.completionRate < 60).slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="icon-3d icon-3d-info h-10 w-10">
          <BookOpen className="h-5 w-5 relative z-10" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Course-Level Analysis</h2>
          <p className="text-xs text-muted-foreground">
            Completion rate, demand, and overdue load per course
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((c) => {
          const lc = lightClasses(trafficLight(c.completionRate));
          const grad =
            c.completionRate >= 80
              ? "var(--gradient-success)"
              : c.completionRate >= 60
              ? "var(--gradient-warning)"
              : "var(--gradient-danger)";
          return (
            <Card
              key={c.courseName}
              className="p-4 flex flex-col gap-3 border-border/70 shadow-sm hover:shadow-elevated transition-shadow bg-gradient-card"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                    c.trainingType === "Mandatory"
                      ? "bg-danger/10 text-danger ring-danger/20"
                      : "bg-secondary text-muted-foreground ring-border",
                  )}
                >
                  {c.trainingType}
                </span>
                <span className={cn("text-xl font-bold tabular-nums leading-none", lc.text)}>
                  {c.completionRate}%
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight line-clamp-2">{c.courseName}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {c.category} · {c.assigned} assigned
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${c.completionRate}%`, backgroundImage: grad }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {c.completed}/{c.assigned} done
                </span>
                <span className={cn("font-semibold", c.overdue > 0 ? "text-danger" : "text-muted-foreground")}>
                  {c.overdue} overdue
                </span>
              </div>
            </Card>
          );
        })}
        {!rows.length && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-8">
            No course data
          </div>
        )}
      </div>

      {struggling.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-warning/10 ring-1 ring-inset ring-warning/30 p-4 text-warning">
          <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Systemic pattern: </span>
            <span className="font-semibold">
              {struggling.map((s) => s.courseName).join(", ")}
            </span>{" "}
            {struggling.length === 1 ? "is" : "are"} consistently under 60%. Consider deadline
            extensions or scheduled cohort sessions.
          </div>
        </div>
      )}
    </div>
  );
}
