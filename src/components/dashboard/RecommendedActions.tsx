import type { TrainingRecord } from "@/lib/training-types";
import { atRiskEmployees, managerPerformance } from "@/lib/training-analytics";
import { Rocket, ArrowRight } from "lucide-react";

interface Props {
  data: TrainingRecord[];
  onViewCritical: () => void;
  onDrillBottomManager: (manager: string) => void;
}

export function RecommendedActions({ data, onViewCritical, onDrillBottomManager }: Props) {
  const risk = atRiskEmployees(data);
  const critical = risk.filter((r) => r.daysOverdue >= 30).length;
  const mgrs = managerPerformance(data);
  const bottom = mgrs[0];
  const weakestCategory = (() => {
    const map = new Map<string, { a: number; c: number }>();
    for (const r of data) {
      const e = map.get(r.courseCategory) ?? { a: 0, c: 0 };
      e.a++;
      if (r.status === "Completed") e.c++;
      map.set(r.courseCategory, e);
    }
    let worst: { name: string; rate: number } | null = null;
    for (const [name, v] of map) {
      const rate = v.a ? Math.round((v.c / v.a) * 100) : 0;
      if (!worst || rate < worst.rate) worst = { name, rate };
    }
    return worst;
  })();

  return (
    <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 shadow-lg overflow-hidden relative">
      <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-accent-brand/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="h-10 w-10 rounded-xl bg-accent-brand/30 ring-1 ring-inset ring-primary-foreground/20 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold mb-1">Recommended Actions</div>
            <div className="text-xs text-primary-foreground/80 leading-relaxed">
              {critical > 0 && (
                <>
                  <span className="font-semibold text-primary-foreground">{critical}</span> employees
                  are 30+ days overdue.{" "}
                </>
              )}
              {bottom && bottom.completionRate < 60 && (
                <>
                  <span className="font-semibold text-primary-foreground">{bottom.manager}</span>'s
                  team needs attention ({bottom.completionRate}%).{" "}
                </>
              )}
              {weakestCategory && (
                <>
                  Weakest category: <span className="font-semibold text-primary-foreground">{weakestCategory.name}</span>{" "}
                  at {weakestCategory.rate}%.
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {critical > 0 && (
            <button
              type="button"
              onClick={onViewCritical}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger text-danger-foreground px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              View {critical} critical <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {bottom && (
            <button
              type="button"
              onClick={() => onDrillBottomManager(bottom.manager)}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning text-warning-foreground px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              Drill → {bottom.manager.split(" ")[0]} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
