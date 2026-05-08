import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { atRiskEmployees } from "@/lib/training-analytics";
import { sendNudge } from "@/lib/nudge.functions";
import type { TrainingRecord } from "@/lib/training-types";
import {
  AlertTriangle,
  Search,
  Mail,
  Calendar,
  Clock,
  Flame,
  ShieldAlert,
  ChevronRight,
  Filter,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE = 8;

type RiskBucket = "all" | "critical" | "high" | "moderate";

function avatarGradient(name: string) {
  const palettes = [
    "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.58 0.21 15))",
    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.72 0.18 55))",
    "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.5 0.2 320))",
    "linear-gradient(135deg, oklch(0.62 0.16 235), oklch(0.55 0.18 270))",
    "linear-gradient(135deg, oklch(0.66 0.16 150), oklch(0.6 0.18 180))",
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

function riskOf(days: number): { label: string; tone: "critical" | "high" | "moderate"; pct: number } {
  if (days >= 30) return { label: "Critical", tone: "critical", pct: 100 };
  if (days >= 14) return { label: "High", tone: "high", pct: 70 };
  return { label: "Moderate", tone: "moderate", pct: 40 };
}

export function AtRiskTable({
  data,
  defaultBucket = "all",
  managerFilter,
}: {
  data: TrainingRecord[];
  defaultBucket?: RiskBucket;
  managerFilter?: string;
}) {
  const sourceAll = atRiskEmployees(data);
  const all = managerFilter ? sourceAll.filter((r) => r.managerName === managerFilter) : sourceAll;
  const [limit, setLimit] = useState(PAGE);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<RiskBucket>(defaultBucket);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [nudgingAll, setNudgingAll] = useState(false);
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const nudgeFn = useServerFn(sendNudge);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      const risk = riskOf(r.daysOverdue).tone;
      if (bucket !== "all" && risk !== bucket) return false;
      if (!q) return true;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.courseName.toLowerCase().includes(q) ||
        r.managerName.toLowerCase().includes(q)
      );
    });
  }, [all, query, bucket]);

  const visible = filtered.slice(0, limit);

  const counts = useMemo(() => {
    let critical = 0, high = 0, moderate = 0;
    let mandatory = 0;
    for (const r of all) {
      const t = riskOf(r.daysOverdue).tone;
      if (t === "critical") critical++;
      else if (t === "high") high++;
      else moderate++;
      if (r.trainingType === "Mandatory") mandatory++;
    }
    return { critical, high, moderate, mandatory };
  }, [all]);

  return (
    <Card className="p-0 overflow-hidden border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border/60">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
          <div className="flex items-start gap-3">
            <div className="icon-3d icon-3d-danger h-10 w-10 shrink-0 shadow-glow-brand">
              <AlertTriangle className="h-5 w-5 relative z-10" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                Overdue / At-Risk Employees
                {counts.critical > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ring-danger/20">
                    <Flame className="h-3 w-3" />
                    {counts.critical} critical
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sorted by highest risk first — needs immediate manager action
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={nudgingAll || !filtered.length}
            onClick={async () => {
              if (!filtered.length) return toast.info("No learners to nudge");
              setNudgingAll(true);
              try {
                const res = await nudgeFn({
                  data: {
                    channel: "email",
                    source: "at-risk:bulk",
                    recipients: filtered.map((r) => ({
                      employeeId: r.employeeId,
                      employeeName: r.employeeName,
                      managerName: r.managerName,
                      courseName: r.courseName,
                      daysOverdue: r.daysOverdue,
                    })),
                  },
                });
                if (res.success) {
                  toast.success(`Nudge sent to ${res.sent} learner${res.sent === 1 ? "" : "s"}`, {
                    description: `Reminder ${res.reminderId} delivered via ${res.channel}.`,
                  });
                } else {
                  toast.warning(`Sent ${res.sent}, ${res.failed} failed`, {
                    description: `Reminder ${res.reminderId}.`,
                  });
                }
              } catch (e) {
                toast.error("Failed to send nudges", {
                  description: e instanceof Error ? e.message : "Unknown error",
                });
              } finally {
                setNudgingAll(false);
              }
            }}
            className="h-9 text-xs shadow-sm"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {nudgingAll ? "Sending…" : `Nudge all (${filtered.length})`}
          </Button>
        </div>

        {/* Risk bucket pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <BucketPill
            active={bucket === "all"}
            onClick={() => setBucket("all")}
            tone="neutral"
            count={all.length}
          >
            All overdue
          </BucketPill>
          <BucketPill
            active={bucket === "critical"}
            onClick={() => setBucket("critical")}
            tone="critical"
            count={counts.critical}
            icon={<Flame className="h-3 w-3" />}
          >
            Critical (30d+)
          </BucketPill>
          <BucketPill
            active={bucket === "high"}
            onClick={() => setBucket("high")}
            tone="high"
            count={counts.high}
            icon={<AlertTriangle className="h-3 w-3" />}
          >
            High (14–29d)
          </BucketPill>
          <BucketPill
            active={bucket === "moderate"}
            onClick={() => setBucket("moderate")}
            tone="moderate"
            count={counts.moderate}
            icon={<Clock className="h-3 w-3" />}
          >
            Moderate (1–13d)
          </BucketPill>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
            <span className="font-semibold tabular-nums text-foreground">
              {counts.mandatory}
            </span>
            mandatory overdue
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employee, course, or manager…"
            className="pl-9 h-9 text-sm bg-card"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border/60">
        {visible.map((r, i) => {
          const risk = riskOf(r.daysOverdue);
          const isOpen = expanded === i;
          const toneRing =
            risk.tone === "critical"
              ? "ring-danger/30 bg-danger/[0.04]"
              : risk.tone === "high"
              ? "ring-warning/30"
              : "ring-border";

          return (
            <div
              key={i}
              className={cn(
                "group transition-colors",
                isOpen ? "bg-secondary/40" : "hover:bg-secondary/30",
                risk.tone === "critical" && !isOpen && "bg-danger/[0.02]",
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full text-left px-6 py-3.5 flex items-center gap-4"
              >
                {/* Avatar with risk ring */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2",
                      toneRing,
                    )}
                    style={{ backgroundImage: avatarGradient(r.employeeName) }}
                  >
                    {initials(r.employeeName)}
                  </div>
                  {risk.tone === "critical" && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-danger ring-2 ring-card flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger-foreground animate-pulse" />
                    </span>
                  )}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1 sm:flex-none sm:w-[180px]">
                  <div className="font-semibold text-sm text-foreground truncate">
                    {r.employeeName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.employeeId} · reports to {r.managerName}
                  </div>
                </div>

                {/* Course */}
                <div className="hidden md:block min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">
                    {r.courseName}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-px text-[10px] font-semibold",
                        r.trainingType === "Mandatory"
                          ? "bg-danger/10 text-danger"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {r.trainingType}
                    </span>
                    <span>·</span>
                    <span>{r.category}</span>
                  </div>
                </div>

                {/* Risk meter */}
                <div className="hidden lg:flex flex-col items-end w-32 shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums leading-none",
                        risk.tone === "critical" && "text-danger",
                        risk.tone === "high" && "text-warning",
                        risk.tone === "moderate" && "text-foreground",
                      )}
                    >
                      {r.daysOverdue}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      days late
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${risk.pct}%`,
                        backgroundImage:
                          risk.tone === "critical"
                            ? "var(--gradient-danger)"
                            : risk.tone === "high"
                            ? "var(--gradient-warning)"
                            : "linear-gradient(90deg, oklch(0.62 0.16 235), oklch(0.55 0.18 250))",
                      }}
                    />
                  </div>
                </div>

                {/* Mobile compact days */}
                <div className="lg:hidden text-right shrink-0">
                  <div
                    className={cn(
                      "text-base font-bold tabular-nums",
                      risk.tone === "critical" && "text-danger",
                      risk.tone === "high" && "text-warning",
                    )}
                  >
                    {r.daysOverdue}d
                  </div>
                  <div className="text-[10px] text-muted-foreground">overdue</div>
                </div>

                {/* Risk badge */}
                <div className="hidden sm:flex w-20 justify-end shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                      risk.tone === "critical" &&
                        "bg-danger/10 text-danger ring-danger/20",
                      risk.tone === "high" &&
                        "bg-warning/15 text-warning ring-warning/30",
                      risk.tone === "moderate" &&
                        "bg-secondary text-muted-foreground ring-border",
                    )}
                  >
                    {risk.label}
                  </span>
                </div>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                    isOpen && "rotate-90",
                  )}
                />
              </button>

              {/* Expanded actions */}
              {isOpen && (
                <div className="px-6 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="rounded-lg border border-border/70 bg-card p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <DetailItem
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      label="Due date"
                      value={r.dueDate}
                    />
                    <DetailItem
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label="Status"
                      value={r.status}
                    />
                    <DetailItem
                      icon={<Filter className="h-3.5 w-3.5" />}
                      label="Category"
                      value={r.category}
                    />
                    <DetailItem
                      icon={<ShieldAlert className="h-3.5 w-3.5" />}
                      label="Type"
                      value={r.trainingType}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {risk.tone === "critical"
                        ? "🚨 Escalate to manager and HR — compliance risk."
                        : risk.tone === "high"
                        ? "⚠️ Schedule a 1:1 this week to unblock."
                        : "💬 Send a friendly nudge to keep on track."}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={nudgingId === r.employeeId}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setNudgingId(r.employeeId);
                          try {
                            const res = await nudgeFn({
                              data: {
                                channel: "email",
                                source: "at-risk:single",
                                recipients: [
                                  {
                                    employeeId: r.employeeId,
                                    employeeName: r.employeeName,
                                    managerName: r.managerName,
                                    courseName: r.courseName,
                                    daysOverdue: r.daysOverdue,
                                  },
                                ],
                              },
                            });
                            if (res.success) {
                              toast.success(`Nudge sent to ${r.employeeName}`, {
                                description: `Reminder ${res.reminderId} for "${r.courseName}" delivered.`,
                              });
                            } else {
                              toast.error(`Nudge failed for ${r.employeeName}`, {
                                description: res.errors[0]?.reason ?? "Unknown error",
                              });
                            }
                          } catch (err) {
                            toast.error("Nudge failed", {
                              description: err instanceof Error ? err.message : "Unknown error",
                            });
                          } finally {
                            setNudgingId(null);
                          }
                        }}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        {nudgingId === r.employeeId ? "Sending…" : "Nudge"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Email reminder
                      </Button>
                      <Button size="sm" className="h-7 text-xs">
                        Mark as escalated
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!visible.length && (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-3">
              ✓
            </div>
            <div className="text-sm font-semibold text-foreground">
              {all.length === 0
                ? "Everyone is on track 🎉"
                : "No matches for current filters"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {all.length === 0
                ? "No overdue trainings in scope."
                : "Try a different bucket or clear the search."}
            </div>
          </div>
        )}
      </div>

      {limit < filtered.length && (
        <div className="px-6 py-4 border-t border-border/60 flex justify-center bg-secondary/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit(limit + PAGE)}
          >
            Show {Math.min(PAGE, filtered.length - limit)} more
            <span className="ml-1.5 text-muted-foreground">
              ({filtered.length - limit} remaining)
            </span>
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ---------------- helpers ---------------- */

function BucketPill({
  active,
  onClick,
  tone,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "neutral" | "critical" | "high" | "moderate";
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const activeStyles = {
    neutral: "bg-foreground text-background shadow-sm",
    critical: "bg-danger text-danger-foreground shadow-sm shadow-glow-brand",
    high: "bg-warning text-warning-foreground shadow-sm",
    moderate: "bg-info text-info-foreground shadow-sm",
  }[tone];
  const inactiveStyles = {
    neutral: "bg-secondary text-muted-foreground hover:text-foreground",
    critical: "bg-danger/10 text-danger hover:bg-danger/15",
    high: "bg-warning/15 text-warning hover:bg-warning/20",
    moderate: "bg-secondary text-muted-foreground hover:text-foreground",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
        active ? activeStyles : inactiveStyles,
      )}
    >
      {icon}
      {children}
      <span
        className={cn(
          "tabular-nums rounded-full px-1.5 py-px text-[10px] font-bold",
          active ? "bg-background/20" : "bg-background/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-foreground mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}
