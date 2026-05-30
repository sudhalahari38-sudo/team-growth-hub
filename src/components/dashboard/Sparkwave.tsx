import type { MetricPoint } from "@/lib/training-analytics";

type Tone = "primary" | "success" | "info" | "danger" | "warning";

const toneStroke: Record<Tone, { from: string; mid: string; to: string; dot: string }> = {
  primary: {
    from: "oklch(0.55 0.18 270)",
    mid: "oklch(0.62 0.16 250)",
    to: "oklch(0.66 0.16 220)",
    dot: "oklch(0.55 0.18 270)",
  },
  success: {
    from: "oklch(0.62 0.16 160)",
    mid: "oklch(0.65 0.18 150)",
    to: "oklch(0.7 0.16 140)",
    dot: "oklch(0.62 0.18 150)",
  },
  info: {
    from: "oklch(0.55 0.18 235)",
    mid: "oklch(0.62 0.16 220)",
    to: "oklch(0.66 0.16 195)",
    dot: "oklch(0.62 0.16 220)",
  },
  danger: {
    from: "oklch(0.6 0.2 25)",
    mid: "oklch(0.65 0.21 20)",
    to: "oklch(0.7 0.18 15)",
    dot: "oklch(0.6 0.2 25)",
  },
  warning: {
    from: "oklch(0.7 0.18 60)",
    mid: "oklch(0.72 0.18 55)",
    to: "oklch(0.75 0.18 45)",
    dot: "oklch(0.7 0.18 55)",
  },
};

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

export function Sparkwave({
  data,
  tone,
  target,
  formatValue,
  gradientId,
}: {
  data: MetricPoint[];
  tone: Tone;
  target?: number;
  formatValue?: (v: number) => string;
  gradientId: string;
}) {
  const W = 280;
  const H = 64;
  const PAD = { top: 6, right: 6, bottom: 14, left: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1);
  const min = 0;

  const points = data.map((d, i) => ({
    x: PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: PAD.top + innerH - ((d.value - min) / (max - min || 1)) * innerH,
    v: d.value,
    label: d.label,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`
    : "";

  const targetY =
    target !== undefined ? PAD.top + innerH - ((target - min) / (max - min || 1)) * innerH : null;

  const colors = toneStroke[tone];
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend waveform"
    >
      <defs>
        <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.mid} stopOpacity="0.45" />
          <stop offset="60%" stopColor={colors.mid} stopOpacity="0.12" />
          <stop offset="100%" stopColor={colors.mid} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.from} />
          <stop offset="50%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.to} />
        </linearGradient>
      </defs>

      {targetY !== null && (
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={targetY}
          y2={targetY}
          stroke="oklch(0.65 0.18 30)"
          strokeDasharray="3 3"
          strokeWidth="1"
          opacity="0.55"
        />
      )}

      {points.length > 0 && (
        <>
          <path d={areaPath} fill={`url(#${gradientId}-area)`} />
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${gradientId}-stroke)`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {last && (
            <circle
              cx={last.x}
              cy={last.y}
              r="2.75"
              fill="oklch(1 0 0)"
              stroke={colors.dot}
              strokeWidth="1.75"
            />
          )}
        </>
      )}

      {points.map((p, i) => {
        const showEvery = Math.max(1, Math.ceil(points.length / 4));
        if (i % showEvery !== 0 && i !== points.length - 1) return null;
        return (
          <text
            key={`x-${i}`}
            x={p.x}
            y={H - 3}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="7"
          >
            {p.label}
          </text>
        );
      })}

      {points.map((p, i) => (
        <title key={`t-${i}`}>{`${p.label}: ${formatValue ? formatValue(p.v) : p.v}`}</title>
      ))}
    </svg>
  );
}
