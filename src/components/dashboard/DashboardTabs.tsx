import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BookOpen,
  Sparkles,
  MessageSquareHeart,
  Building2,
  BarChart3,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type { IdentityRole } from "@/lib/current-user";

export type DashboardView =
  | "overview"
  | "leadership"
  | "managers"
  | "at-risk"
  | "courses"
  | "forecast"
  | "feedback"
  | "training";

interface Tab {
  id: DashboardView;
  label: string;
  icon: ReactNode;
}

const ADMIN_TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "leadership", label: "Leadership", icon: <Building2 className="h-4 w-4" /> },
  { id: "managers", label: "Manager Drill-Down", icon: <Users className="h-4 w-4" /> },
  { id: "at-risk", label: "At-Risk Employees", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
  { id: "forecast", label: "Forecast", icon: <Sparkles className="h-4 w-4" /> },
  { id: "feedback", label: "Training Feedback", icon: <MessageSquareHeart className="h-4 w-4" /> },
];

const LEADERSHIP_TABS: Tab[] = [
  { id: "training", label: "Training Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
];

const MANAGER_TABS: Tab[] = [
  { id: "training", label: "My Team", icon: <UsersRound className="h-4 w-4" /> },
];

export function tabsForRole(role: IdentityRole): Tab[] {
  if (role === "admin") return ADMIN_TABS;
  if (role === "leadership") return LEADERSHIP_TABS;
  return MANAGER_TABS;
}

export function defaultViewForRole(role: IdentityRole): DashboardView {
  if (role === "admin") return "overview";
  return "training";
}


export function DashboardTabs({
  active,
  onChange,
  role,
}: {
  active: DashboardView;
  onChange: (v: DashboardView) => void;
  role: IdentityRole;
}) {
  const visible = tabsForRole(role);
  if (visible.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
      {visible.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "relative inline-flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2",
            active === t.id
              ? "text-accent-brand border-accent-brand"
              : "text-muted-foreground border-transparent hover:text-foreground",
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
