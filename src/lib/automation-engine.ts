/**
 * Automation engine: pull → clean → analyze → generate → distribute → nudge → log.
 *
 * Runs client-side today (no backend). When Lovable Cloud is enabled this same
 * pipeline moves to a cron-triggered server route with real email delivery.
 */
import type { TrainingRecord } from "./training-types";
import { daysOverdue, isOverdue } from "./training-analytics";
import {
  computeNextRun,
  resolveRecipients,
  type AutomationConfig,
  type AutomationRun,
  type RunStep,
} from "./automation-types";
import { appendRun, upsertAutomation } from "./automation-store";
import { renderNudge, tierForDays, type NudgeTier } from "./nudge-templates";
import { historyFor, logNudge } from "./nudge-history";
import { sendNudge } from "./nudge.functions";

/* --------------------------------- cleaning -------------------------------- */

export interface CleanResult {
  rows: TrainingRecord[];
  duplicates: number;
  invalid: number;
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ");
const validDate = (s: string | null) => !!s && !Number.isNaN(new Date(s).getTime());

export function cleanRecords(rows: TrainingRecord[]): CleanResult {
  const seen = new Set<string>();
  const out: TrainingRecord[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (const r of rows) {
    const employeeName = norm(r.employeeName ?? "");
    const courseName = norm(r.courseName ?? "");
    if (!employeeName || !courseName || !validDate(r.dueDate)) {
      invalid++;
      continue;
    }
    const key = `${r.employeeId || employeeName}::${courseName}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    out.push({
      ...r,
      employeeName,
      courseName,
      managerName: norm(r.managerName || "Unassigned"),
      department: norm(r.department || "Unassigned"),
      completionDate: validDate(r.completionDate) ? r.completionDate : null,
    });
  }
  return { rows: out, duplicates, invalid };
}

/* --------------------------------- scoping --------------------------------- */

export function applyScope(rows: TrainingRecord[], cfg: AutomationConfig): TrainingRecord[] {
  return rows.filter((r) => {
    if (cfg.courses.length && !cfg.courses.includes(r.courseName)) return false;
    if (cfg.departments.length && !cfg.departments.includes(r.department)) return false;
    const overdue = isOverdue(r);
    if (overdue) return cfg.include.overdue;
    if (r.status === "Completed") return cfg.include.completed;
    if (r.status === "In Progress") return cfg.include.inProgress;
    return cfg.include.notStarted;
  });
}

/* ---------------------------------- runner --------------------------------- */

import { buildCsv, buildSubject, buildSummary, computeReportMetrics } from "./automation-report";

export interface RunContext {
  /** Latest dataset available to the app (LMS sync or uploaded CSV). */
  data: TrainingRecord[];
  managers: string[];
  trigger: AutomationRun["trigger"];
  sentBy?: string;
}

export async function runAutomation(
  cfg: AutomationConfig,
  ctx: RunContext,
): Promise<AutomationRun> {
  const startedAt = new Date();
  const steps: RunStep[] = [];
  const nudges: Record<NudgeTier, number> = { reminder: 0, warning: 0, escalation: 0 };
  let status: AutomationRun["status"] = "success";
  let error: string | undefined;

  let scoped: TrainingRecord[] = [];
  let clean: CleanResult = { rows: [], duplicates: 0, invalid: 0 };
  let metrics = computeReportMetrics([]);
  let csv = "";
  let summary = "";
  let recipients: string[] = [];
  const subject = buildSubject(cfg, startedAt);

  const dates = ctx.data.map((r) => r.assignedDate).filter(Boolean).sort();
  const periodFrom = dates[0] ?? "—";
  const periodTo = dates[dates.length - 1] ?? "—";

  try {
    // 1. Pull
    if (!ctx.data.length) throw new Error("LMS returned no training records");
    steps.push({
      key: "pull",
      label: "Pull latest LMS data",
      detail: `${ctx.data.length.toLocaleString()} records retrieved`,
    });

    // 2. Clean & validate
    clean = cleanRecords(ctx.data);
    steps.push({
      key: "clean",
      label: "Clean & validate",
      detail: `${clean.rows.length.toLocaleString()} valid · ${clean.duplicates} duplicates removed · ${clean.invalid} invalid rows dropped`,
    });

    // 3. Analyze (scoped)
    scoped = applyScope(clean.rows, cfg);
    metrics = computeReportMetrics(scoped);
    steps.push({
      key: "analyze",
      label: "Generate compliance report",
      detail: `${scoped.length.toLocaleString()} in scope · ${metrics.completionRate.toFixed(1)}% complete · ${metrics.overdueCount} overdue · ${metrics.atRiskLearners} at risk`,
    });

    // 4. Distribute
    summary = buildSummary(cfg, metrics, scoped, periodFrom, periodTo);
    csv = cfg.attachCsv ? buildCsv(scoped) : "";
    recipients = resolveRecipients(cfg, ctx.managers);
    if (!recipients.length) throw new Error("No recipients configured");
    steps.push({
      key: "distribute",
      label: "Send report",
      detail: `Emailed ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}${cfg.attachCsv ? " with CSV attachment" : ""}`,
    });

    // 5. Nudges
    if (cfg.nudgesEnabled) {
      const overdueRows = scoped.filter((r) => isOverdue(r));
      const queued: {
        row: TrainingRecord;
        tier: NudgeTier;
        days: number;
        subject: string;
      }[] = [];

      for (const r of overdueRows) {
        const days = daysOverdue(r);
        const tier = tierForDays(days);
        if (!tier || !cfg.nudgeTiers[tier]) continue;
        // skip if the same tier was already sent for this learner + course
        const already = historyFor(r.employeeId, r.courseName).some((h) => h.tier === tier);
        if (already) continue;
        const rendered = renderNudge(tier, {
          employeeName: r.employeeName,
          managerName: r.managerName,
          courseName: r.courseName,
          dueDate: r.dueDate,
          daysOverdue: days,
        });
        queued.push({ row: r, tier, days, subject: rendered.subject });
      }

      if (queued.length) {
        await sendNudge({
          data: {
            recipients: queued.map((q) => ({
              employeeId: q.row.employeeId,
              employeeName: q.row.employeeName,
              managerName: q.row.managerName,
              courseName: q.row.courseName,
              daysOverdue: q.days,
            })),
            channel: "email",
            source: `automation:${cfg.id}`,
          },
        });
        const sentAt = new Date().toISOString();
        for (const q of queued) {
          nudges[q.tier]++;
          logNudge({
            id: `nud_${Math.random().toString(36).slice(2, 10)}`,
            employeeId: q.row.employeeId,
            employeeName: q.row.employeeName,
            courseName: q.row.courseName,
            tier: q.tier,
            daysOverdue: q.days,
            subject: q.subject,
            sentAt,
            sentBy: ctx.sentBy ?? "Automation engine",
            channel: "email",
          });
        }
      }
      const total = nudges.reminder + nudges.warning + nudges.escalation;
      steps.push({
        key: "nudge",
        label: "Send learner nudges",
        detail: total
          ? `${total} sent · ${nudges.reminder} reminder · ${nudges.warning} warning · ${nudges.escalation} escalation`
          : "No new nudges due",
      });
    } else {
      steps.push({ key: "nudge", label: "Send learner nudges", detail: "Disabled for this automation" });
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  const run: AutomationRun = {
    id: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    automationId: cfg.id,
    automationName: cfg.name,
    reportType: cfg.reportType,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    trigger: ctx.trigger,
    status,
    error,
    periodFrom,
    periodTo,
    rowsIn: ctx.data.length,
    rowsClean: scoped.length,
    duplicatesRemoved: clean.duplicates,
    invalidRemoved: clean.invalid,
    recipients,
    subject,
    summary,
    csv,
    metrics,
    nudges,
    steps,
  };

  appendRun(run);
  return run;
}

/** Execute any due automations and roll their schedules forward. */
export async function tickAutomations(
  cfgs: AutomationConfig[],
  ctx: Omit<RunContext, "trigger">,
  now: Date = new Date(),
): Promise<AutomationRun[]> {
  const out: AutomationRun[] = [];
  for (const cfg of cfgs) {
    if (!cfg.active) continue;
    const due = new Date(cfg.nextRunAt);
    if (Number.isNaN(due.getTime()) || due > now) continue;
    const missedBy = now.getTime() - due.getTime();
    const run = await runAutomation(cfg, {
      ...ctx,
      trigger: missedBy > 5 * 60 * 1000 ? "catch-up" : "scheduled",
    });
    out.push(run);
    upsertAutomation({ ...cfg, nextRunAt: computeNextRun(cfg, now).toISOString() });
  }
  return out;
}
