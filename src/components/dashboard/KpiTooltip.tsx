import { useState } from "react";
import { cn } from "@/lib/utils";

export interface KpiStat {
  label: string;
  value: string;
}

export interface KpiTooltipData {
  title: string;
  definition: string;
  /** @deprecated no longer rendered — kept for call-site compatibility */
  formula?: string;
  current: string;
  previous?: string;
  deltaLabel?: string;
  deltaDir?: "up" | "down" | "flat";
  deltaGood?: boolean;
  lastUpdated: string;
  action?: string;
  stats?: KpiStat[];
}

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;

/**
 * Wraps any KPI element and shows a rich definition/formula/trend tooltip on hover or focus.
 */
export function KpiTooltip({
  info,
  children,
  className,
  onActivate,
}: {
  info: KpiTooltipData;
  children: React.ReactNode;
  className?: string;
  onActivate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onClick={onActivate}
      tabIndex={0}
      role={onActivate ? "button" : undefined}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-[min(21rem,80vw)] rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-xl p-3.5 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-[12px] font-semibold text-foreground">{info.title}</div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{info.definition}</p>

          <div className="mt-2 rounded-md bg-secondary/60 px-2.5 py-1.5 font-mono text-[10px] leading-snug text-muted-foreground">
            <span className="text-muted-foreground/70">ƒ</span> {info.formula}
          </div>

          <dl className="mt-2.5 space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Current</dt>
              <dd className="font-semibold tabular-nums text-foreground">{info.current}</dd>
            </div>
            {info.previous && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Previous period</dt>
                <dd className="tabular-nums text-foreground">{info.previous}</dd>
              </div>
            )}
            {info.deltaLabel && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Trend</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    info.deltaDir === "flat"
                      ? "text-muted-foreground"
                      : info.deltaGood
                      ? "text-success"
                      : "text-danger",
                  )}
                >
                  {ARROW[info.deltaDir ?? "flat"]} {info.deltaLabel}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="tabular-nums text-foreground">{info.lastUpdated}</dd>
            </div>
          </dl>

          {info.action && (
            <div className="mt-2.5 border-t border-border/60 pt-2 text-[11px] font-medium text-primary">
              {info.action}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function formatRefreshed(d: Date = new Date()) {
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export function deltaInfo(current: number, previous: number, higherIsBetter = true, unit = "") {
  const diff = current - previous;
  const dir: "up" | "down" | "flat" = Math.abs(diff) < 0.05 ? "flat" : diff > 0 ? "up" : "down";
  const pct = previous ? (diff / Math.abs(previous)) * 100 : 0;
  const label =
    dir === "flat"
      ? "No change"
      : `${diff > 0 ? "+" : ""}${diff.toFixed(unit === "%" ? 1 : 0)}${unit}${
          previous ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""
        }`;
  return {
    deltaDir: dir,
    deltaLabel: label,
    deltaGood: dir === "flat" ? true : higherIsBetter ? diff > 0 : diff < 0,
  };
}
