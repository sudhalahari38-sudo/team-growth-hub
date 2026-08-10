import { useState } from "react";
import { ChevronDown, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_LABELS, type AutomationRun } from "@/lib/automation-types";
import { downloadCsv } from "@/lib/automation-report";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function AutomationHistory({ runs }: { runs: AutomationRun[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!runs.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No runs yet. Automations log every report here once they execute.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
        Automation history
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Automation</th>
              <th className="px-4 py-2 font-medium">Run</th>
              <th className="px-4 py-2 font-medium">Data period</th>
              <th className="px-4 py-2 font-medium">Recipients</th>
              <th className="px-4 py-2 font-medium">Nudges</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const nudgeTotal = r.nudges.reminder + r.nudges.warning + r.nudges.escalation;
              const isOpen = open === r.id;
              return (
                <>
                  <tr
                    key={r.id}
                    className="border-t border-border hover:bg-secondary/60 cursor-pointer"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{r.automationName}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {REPORT_TYPE_LABELS[r.reportType]} · {r.trigger}
                      </div>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{fmt(r.startedAt)}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {r.periodFrom} → {r.periodTo}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{r.recipients.length}</td>
                    <td className="px-4 py-2 tabular-nums">{nudgeTotal}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.status === "success"
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger",
                        )}
                      >
                        {r.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${r.id}-detail`} className="border-t border-border bg-secondary/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Pipeline
                            </div>
                            <ol className="space-y-1.5">
                              {r.steps.map((s, i) => (
                                <li key={s.key} className="flex gap-2">
                                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent-brand/15 text-[9px] font-bold text-accent-brand">
                                    {i + 1}
                                  </span>
                                  <span>
                                    <span className="font-medium text-foreground">{s.label}</span>{" "}
                                    <span className="text-muted-foreground">— {s.detail}</span>
                                  </span>
                                </li>
                              ))}
                            </ol>
                            {r.error && (
                              <div className="mt-2 rounded-md bg-danger/10 px-2 py-1 text-danger">
                                {r.error}
                              </div>
                            )}
                            <div className="mt-3 text-[11px] text-muted-foreground">
                              Rows in {r.rowsIn.toLocaleString()} · in scope{" "}
                              {r.rowsClean.toLocaleString()} · {r.duplicatesRemoved} duplicates ·{" "}
                              {r.invalidRemoved} invalid
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground break-words">
                              To: {r.recipients.join(", ") || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Report sent
                              </div>
                              {r.csv && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-brand"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadCsv(
                                      `${r.automationName.replace(/\s+/g, "-").toLowerCase()}-${r.startedAt.slice(0, 10)}.csv`,
                                      r.csv,
                                    );
                                  }}
                                >
                                  <Download className="h-3 w-3" /> Download CSV
                                </button>
                              )}
                            </div>
                            <div className="mb-1 font-medium text-foreground">{r.subject}</div>
                            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
                              {r.summary || "—"}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
