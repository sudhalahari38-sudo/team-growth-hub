import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  managerPerformance,
  lightClasses,
  trafficLight,
} from "@/lib/training-analytics";
import type { TrainingRecord } from "@/lib/training-types";
import { cn } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUpDown,
  ChevronRight,
  Trophy,
  Target,
} from "lucide-react";

type SortKey = "completionRate" | "overdueCount" | "teamSize";

// Deterministic avatar gradient from name
function avatarGradient(name: string) {
  const palettes = [
    "linear-gradient(135deg, oklch(0.62 0.16 235), oklch(0.55 0.18 270))",
    "linear-gradient(135deg, oklch(0.66 0.16 150), oklch(0.6 0.18 180))",
    "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.58 0.21 15))",
    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.72 0.18 55))",
    "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.5 0.2 320))",
    "linear-gradient(135deg, oklch(0.34 0.09 260), oklch(0.42 0.12 245))",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ManagerPerformance({
  data,
  onDrill,
}: {
  data: TrainingRecord[];
  onDrill?: (manager: string) => void;
}) {
  const allRows = managerPerformance(data);
  const [sortKey, setSortKey] = useState<SortKey>("completionRate");
  const [desc, setDesc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = [...allRows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return desc ? bv - av : av - bv;
  });

  const teamAvg =
    allRows.length
      ? Math.round(
          allRows.reduce((sum, r) => sum + r.completionRate, 0) / allRows.length,
        )
      : 0;

  const top = [...allRows].sort((a, b) => b.completionRate - a.completionRate)[0];
  const bottom = [...allRows].sort((a, b) => a.completionRate - b.completionRate)[0];
  const totalOverdue = allRows.reduce((s, r) => s + r.overdueCount, 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(key !== "completionRate");
    }
  };

  return (
    <Card className="p-0 overflow-hidden border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      {/* Header with KPI strip */}
      <div className="px-6 pt-6 pb-5 border-b border-border/60">
        <div className="flex items-start gap-3 mb-5">
          <div className="icon-3d h-10 w-10 shrink-0">
            <Users className="h-5 w-5 relative z-10" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground tracking-tight">
              Manager Performance
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Team completion benchmarked against the {teamAvg}% org average
            </p>
          </div>
        </div>

        {/* Mini KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat
            label="Org average"
            value={`${teamAvg}%`}
            tone="primary"
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <MiniStat
            label="Top performer"
            value={top ? `${top.completionRate}%` : "—"}
            sub={top?.manager}
            tone="success"
            icon={<Trophy className="h-3.5 w-3.5" />}
          />
          <MiniStat
            label="Needs attention"
            value={bottom ? `${bottom.completionRate}%` : "—"}
            sub={bottom?.manager}
            tone="danger"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <MiniStat
            label="Total overdue"
            value={totalOverdue.toLocaleString()}
            tone="warning"
            icon={<AlertCircle className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Sort controls */}
      <div className="px-6 py-2.5 border-b border-border/60 flex items-center gap-1 text-xs bg-secondary/30">
        <span className="text-muted-foreground mr-2 font-semibold uppercase tracking-wider text-[10px]">
          Sort
        </span>
        <SortChip
          active={sortKey === "completionRate"}
          desc={desc}
          onClick={() => toggleSort("completionRate")}
        >
          Completion
        </SortChip>
        <SortChip
          active={sortKey === "overdueCount"}
          desc={desc}
          onClick={() => toggleSort("overdueCount")}
        >
          Overdue
        </SortChip>
        <SortChip
          active={sortKey === "teamSize"}
          desc={desc}
          onClick={() => toggleSort("teamSize")}
        >
          Team size
        </SortChip>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        {rows.map((r, idx) => {
          const light = trafficLight(r.completionRate);
          const lc = lightClasses(light);
          const vsAvg = r.completionRate - teamAvg;
          const isExpanded = expanded === r.manager;
          const barColor =
            light === "red"
              ? "var(--gradient-danger)"
              : light === "yellow"
              ? "var(--gradient-warning)"
              : "var(--gradient-success)";

          return (
            <div
              key={r.manager}
              className={cn(
                "group transition-colors",
                isExpanded ? "bg-secondary/40" : "hover:bg-secondary/30",
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : r.manager)}
                className="w-full text-left px-6 py-4 flex items-center gap-4"
              >
                {/* Rank */}
                <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-bold tabular-nums text-muted-foreground">
                  #{idx + 1}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none sm:w-[200px]">
                  <div
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-card"
                    style={{ backgroundImage: avatarGradient(r.manager) }}
                  >
                    {initials(r.manager)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {r.manager}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {r.teamSize} {r.teamSize === 1 ? "report" : "reports"}
                      <span className="text-border">·</span>
                      {r.assigned} assignments
                    </div>
                  </div>
                </div>

                {/* Progress bar — hidden on mobile, prominent on md+ */}
                <div className="hidden md:flex flex-1 items-center gap-3 min-w-[200px]">
                  <div className="flex-1 relative h-2.5 rounded-full bg-secondary overflow-hidden shadow-inner">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${r.completionRate}%`,
                        backgroundImage: barColor,
                        boxShadow: "0 1px 2px oklch(0 0 0 / 0.15)",
                      }}
                    />
                    {/* Org avg marker */}
                    <div
                      className="absolute inset-y-0 w-px bg-foreground/40"
                      style={{ left: `${teamAvg}%` }}
                      title={`Org avg ${teamAvg}%`}
                    />
                  </div>
                  <div className="flex flex-col items-end leading-tight w-14 shrink-0">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {r.completionRate}%
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold tabular-nums flex items-center gap-0.5",
                        vsAvg >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {vsAvg >= 0 ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {vsAvg > 0 ? "+" : ""}
                      {vsAvg}%
                    </span>
                  </div>
                </div>

                {/* Mobile compact rate */}
                <div className="md:hidden text-right">
                  <div className="text-base font-bold tabular-nums">
                    {r.completionRate}%
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-semibold",
                      vsAvg >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {vsAvg > 0 ? "+" : ""}
                    {vsAvg}% vs avg
                  </div>
                </div>

                {/* Overdue pill */}
                <div className="hidden lg:flex items-center justify-center w-20 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                      r.overdueCount > 5
                        ? "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20"
                        : r.overdueCount > 0
                        ? "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30"
                        : "bg-success/10 text-success ring-1 ring-inset ring-success/20",
                    )}
                  >
                    {r.overdueCount > 0 && <AlertCircle className="h-3 w-3" />}
                    {r.overdueCount}
                  </span>
                </div>

                {/* Status pill */}
                <div className="hidden sm:flex items-center justify-end w-24 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
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
                </div>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
              </button>

              {/* Expanded drawer */}
              {isExpanded && (
                <div className="px-6 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="rounded-lg border border-border/70 bg-card p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <DetailStat label="Assigned" value={r.assigned} />
                    <DetailStat label="Completed" value={r.completed} tone="success" />
                    <DetailStat
                      label="Outstanding"
                      value={r.assigned - r.completed}
                    />
                    <DetailStat
                      label="Overdue"
                      value={r.overdueCount}
                      tone={r.overdueCount > 0 ? "danger" : undefined}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {r.completionRate >= 80
                        ? `🎉 On track — ${r.completionRate - 80}pp above target.`
                        : r.completionRate >= 60
                        ? `⚠️ ${80 - r.completionRate}pp below the 80% target. Coach team this week.`
                        : `🚨 Critical — ${60 - r.completionRate}pp below the 60% floor. Escalate.`}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Send nudge
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!rows.length && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No data for current filters
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- helpers ---------------- */

function MiniStat({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "primary" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/8 ring-primary/15",
    success: "text-success bg-success/10 ring-success/20",
    warning: "text-warning bg-warning/15 ring-warning/25",
    danger: "text-danger bg-danger/10 ring-danger/20",
  }[tone];
  return (
    <div className={cn("rounded-lg ring-1 ring-inset px-3 py-2.5", toneClass)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] opacity-70 truncate mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function SortChip({
  active,
  desc,
  onClick,
  children,
}: {
  active: boolean;
  desc: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <ArrowUpDown
          className={cn("h-3 w-3 transition-transform", desc && "rotate-180")}
        />
      )}
    </button>
  );
}

function DetailStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-xl font-bold tabular-nums leading-tight",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
