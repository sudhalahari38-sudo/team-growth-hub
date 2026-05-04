import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrainingRecord } from "@/lib/training-types";
import { completionByCategory, monthlyCompletionTrend, trafficLight } from "@/lib/training-analytics";

const lightColor = (rate: number) => {
  const l = trafficLight(rate);
  if (l === "red") return "var(--danger)";
  if (l === "yellow") return "var(--warning)";
  return "var(--success)";
};

export function CategoryChart({ data }: { data: TrainingRecord[] }) {
  const rows = completionByCategory(data);
  return (
    <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start gap-3">
        <div className="icon-3d icon-3d-info h-10 w-10 shrink-0">
          <span className="relative z-10 text-base font-bold">≣</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight">Completion by Category</h3>
          <p className="text-xs text-muted-foreground mt-0.5">% of assigned trainings completed, per category</p>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, _n, p) => [
                `${v}% (${p.payload.completed}/${p.payload.assigned})`,
                "Completion",
              ]}
            />
            <Bar dataKey="completionRate" radius={[6, 6, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={lightColor(r.completionRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TrendChart({ data }: { data: TrainingRecord[] }) {
  const rows = monthlyCompletionTrend(data);
  return (
    <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-10 w-10 shrink-0">
          <span className="relative z-10 text-base font-bold">↗</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight">Monthly Completion Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Trainings completed per month (last 12 months)</p>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent-brand)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "var(--shadow-lg)",
              }}
            />
            <Line
              type="monotone"
              dataKey="completions"
              stroke="url(#trendStroke)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--card)" }}
              activeDot={{ r: 7, strokeWidth: 3, stroke: "var(--card)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
