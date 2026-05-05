import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, AlertTriangle, BookOpen, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type DashboardView = "overview" | "managers" | "at-risk" | "courses" | "forecast";

const TABS: { id: DashboardView; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "managers", label: "Manager Drill-Down", icon: <Users className="h-4 w-4" /> },
  { id: "at-risk", label: "At-Risk Employees", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
  { id: "forecast", label: "Forecast", icon: <Sparkles className="h-4 w-4" /> },
];

export function DashboardTabs({
  active,
  onChange,
}: {
  active: DashboardView;
  onChange: (v: DashboardView) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all",
            active === t.id
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
