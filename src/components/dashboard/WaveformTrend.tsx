import { useMemo, useState } from "react";
import type { TrainingRecord } from "@/lib/training-types";
import {
  monthlyCompletionTrend,
  quarterlyCompletionTrend,
} from "@/lib/training-analytics";
import { Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHLY_TARGET = 25;
const QUARTERLY_TARGET = MONTHLY_TARGET * 3;

type Slice = "month" | "quarter";

/** Monotone cubic spline path for smooth waveform */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export function WaveformTrend({ data }: { data: TrainingRecord[] }) {
  const [slice, setSlice] = useState<Slice>("month");
  const rows = useMemo(
    () => (slice === "month" ? monthlyCompletionTrend(data) : quarterlyCompletionTrend(data)),
    [slice, data],
  );
  const target = slice === "month" ? MONTHLY_TARGET : QUARTERLY_TARGET;
  const sliceLabel = slice === "month" ? "month" : "quarter";

  const W = 560;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 26, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(target + 5, ...rows.map((r) => r.completions), 1);
  const points = rows.map((r, i) => ({
    x: PAD.left + (rows.length === 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW),
    y: PAD.top + innerH - (r.completions / max) * innerH,
    v: r.completions,
    label: r.label,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`
    : "";
  const targetY = PAD.top + innerH - (target / max) * innerH;

  const dipBuckets = rows.filter((r) => r.completions < target).length;
  const last = rows[rows.length - 1];

  // Y axis ticks
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="icon-3d icon-3d-info h-9 w-9 shrink-0">
            <Activity className="h-4 w-4 relative z-10" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm tracking-tight">
              Completion Waveform
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Completions per {sliceLabel} vs. {target}/{sliceLabel.charAt(0)} target
            </p>
          </div>
        </div>
        <div className="inline-flex items-center rounded-md border border-border/70 bg-secondary/40 p-0.5 text-[10px] font-semibold">
          {(["month", "quarter"] as Slice[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlice(s)}
              className={cn(
                "px-2.5 py-1 rounded-[5px] transition-all uppercase tracking-wider",
                slice === s
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "month" ? "Month" : "Quarter"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.16 235)" stopOpacity="0.45" />
              <stop offset="60%" stopColor="oklch(0.62 0.16 235)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="oklch(0.62 0.16 235)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.55 0.18 270)" />
              <stop offset="50%" stopColor="oklch(0.62 0.16 235)" />
              <stop offset="100%" stopColor="oklch(0.66 0.16 180)" />
            </linearGradient>
          </defs>

          {/* Y grid + ticks */}
          {ticks.map((t) => {
            const y = PAD.top + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="9"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Target line */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={targetY}
            y2={targetY}
            stroke="oklch(0.65 0.18 30)"
            strokeDasharray="4 4"
            strokeWidth="1.25"
            opacity="0.7"
          />
          <text
            x={W - PAD.right}
            y={targetY - 4}
            textAnchor="end"
            className="fill-warning"
            fontSize="9"
            fontWeight="600"
          >
            Target {target}
          </text>

          {/* Area + line */}
          {points.length > 0 && (
            <>
              <path d={areaPath} fill="url(#wave-area)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#wave-stroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill="oklch(1 0 0)"
                    stroke={p.v >= target ? "oklch(0.65 0.18 150)" : "oklch(0.7 0.18 60)"}
                    strokeWidth="2"
                  />
                  <title>{`${p.label}: ${p.v}`}</title>
                </g>
              ))}
            </>
          )}

          {/* X labels */}
          {points.map((p, i) => {
            const showEvery = Math.max(1, Math.ceil(points.length / 8));
            if (i % showEvery !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={`x-${i}`}
                x={p.x}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="9"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>

      {dipBuckets > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-warning/15 text-warning px-3 py-2 text-[11px] font-medium">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span>
            {dipBuckets} of {rows.length} {sliceLabel}s below target
            {last && last.completions < target
              ? ` — current ${sliceLabel} at ${last.completions}.`
              : "."}
          </span>
        </div>
      )}
    </div>
  );
}
