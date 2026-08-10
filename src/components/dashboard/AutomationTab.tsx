import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Zap,
  Clock,
  Mail,
  BellRing,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrainingRecord } from "@/lib/training-types";
import {
  REPORT_TYPE_LABELS,
  computeNextRun,
  frequencyLabel,
  resolveRecipients,
  type AutomationConfig,
} from "@/lib/automation-types";
import {
  deleteAutomation,
  listAutomations,
  listRuns,
  subscribeAutomations,
  upsertAutomation,
} from "@/lib/automation-store";
import { runAutomation, tickAutomations } from "@/lib/automation-engine";
import { AutomationDialog } from "./AutomationDialog";
import { AutomationHistory } from "./AutomationHistory";

const TICK_MS = 60_000;

function useAutomationState() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = subscribeAutomations(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);
  return { automations: listAutomations(), runs: listRuns() };
}

/** Background scheduler — mounts once for admins. */
export function useAutomationScheduler(data: TrainingRecord[], managers: string[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const runs = await tickAutomations(listAutomations(), { data, managers });
      for (const r of runs) {
        if (r.status === "success") {
          toast.success(`Automation "${r.automationName}" sent to ${r.recipients.length} recipients`);
        } else {
          toast.error(`Automation "${r.automationName}" failed: ${r.error}`);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [data, managers, enabled]);
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-brand/10 text-accent-brand">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-lg font-semibold tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function AutomationTab({
  data,
  managers,
  courses,
  departments,
}: {
  data: TrainingRecord[];
  managers: string[];
  courses: string[];
  departments: string[];
}) {
  const { automations, runs } = useAutomationState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationConfig | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = automations.filter((a) => a.active).length;
    const nudges = runs.reduce(
      (n, r) => n + r.nudges.reminder + r.nudges.warning + r.nudges.escalation,
      0,
    );
    const failed = runs.filter((r) => r.status === "failed").length;
    const next = automations
      .filter((a) => a.active)
      .map((a) => new Date(a.nextRunAt).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)[0];
    return {
      active: `${active} / ${automations.length}`,
      nextRun: next ? new Date(next).toLocaleString() : "—",
      reports: String(runs.filter((r) => r.status === "success").length),
      nudges: String(nudges),
      failed: String(failed),
    };
  }, [automations, runs]);

  const runNow = useCallback(
    async (cfg: AutomationConfig) => {
      setBusy(cfg.id);
      try {
        const run = await runAutomation(cfg, { data, managers, trigger: "manual" });
        upsertAutomation({ ...cfg, nextRunAt: computeNextRun(cfg, new Date()).toISOString() });
        if (run.status === "success") {
          const n = run.nudges.reminder + run.nudges.warning + run.nudges.escalation;
          toast.success(
            `Report sent to ${run.recipients.length} recipients · ${n} nudge${n === 1 ? "" : "s"} sent`,
          );
        } else {
          toast.error(run.error ?? "Run failed");
        }
      } finally {
        setBusy(null);
      }
    },
    [data, managers],
  );

  const visibleRuns = historyFilter ? runs.filter((r) => r.automationId === historyFilter) : runs;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Automation & scheduled reports</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Configure once — the system pulls the latest LMS data, cleans it, generates the
            compliance report, emails recipients and sends tiered learner nudges on schedule. No
            manual step required.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New automation
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={<Zap className="h-4 w-4" />} label="Active" value={stats.active} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Next run" value={stats.nextRun} />
        <Stat icon={<Mail className="h-4 w-4" />} label="Reports sent" value={stats.reports} />
        <Stat icon={<BellRing className="h-4 w-4" />} label="Nudges sent" value={stats.nudges} />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Failed runs" value={stats.failed} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Automations
        </div>
        {!automations.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No automations yet. Create one to start automated compliance reporting.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Report</th>
                  <th className="px-4 py-2 font-medium">Schedule</th>
                  <th className="px-4 py-2 font-medium">Next run</th>
                  <th className="px-4 py-2 font-medium">Last run</th>
                  <th className="px-4 py-2 font-medium">Recipients</th>
                  <th className="px-4 py-2 font-medium">Nudges</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {automations.map((a) => {
                  const mine = runs.filter((r) => r.automationId === a.id);
                  const last = mine[0];
                  const nudges = mine.reduce(
                    (n, r) => n + r.nudges.reminder + r.nudges.warning + r.nudges.escalation,
                    0,
                  );
                  const errors = mine.filter((r) => r.status === "failed").length;
                  return (
                    <tr key={a.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="px-4 py-2 font-medium text-foreground">{a.name}</td>
                      <td className="px-4 py-2">{REPORT_TYPE_LABELS[a.reportType]}</td>
                      <td className="px-4 py-2">{frequencyLabel(a)}</td>
                      <td className="px-4 py-2 tabular-nums">
                        {a.active ? new Date(a.nextRunAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {last ? new Date(last.startedAt).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {resolveRecipients(a, managers).length}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{nudges}</td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            a.active
                              ? "bg-success/10 text-success"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              a.active ? "animate-pulse bg-success" : "bg-muted-foreground",
                            )}
                          />
                          {a.active ? "Active" : "Paused"}
                        </span>
                        {errors > 0 && (
                          <span className="ml-1 text-[10px] font-semibold text-danger">
                            {errors} err
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={busy === a.id}
                            onClick={() => runNow(a)}
                            title="Run now"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => upsertAutomation({ ...a, active: !a.active })}
                            title={a.active ? "Pause" : "Resume"}
                          >
                            {a.active ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              setEditing(a);
                              setDialogOpen(true);
                            }}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-muted-foreground"
                            onClick={() =>
                              setHistoryFilter(historyFilter === a.id ? null : a.id)
                            }
                            title="View history"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-danger"
                            onClick={() => {
                              deleteAutomation(a.id);
                              toast.success("Automation deleted");
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyFilter && (
        <button
          type="button"
          className="self-start text-[11px] font-semibold text-accent-brand"
          onClick={() => setHistoryFilter(null)}
        >
          Showing history for one automation · show all
        </button>
      )}
      <AutomationHistory runs={visibleRuns} />

      <AutomationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        courses={courses}
        departments={departments}
        onSave={(cfg) => {
          upsertAutomation(cfg);
          toast.success(editing ? "Automation updated" : "Automation created — running on schedule");
        }}
      />
    </div>
  );
}
