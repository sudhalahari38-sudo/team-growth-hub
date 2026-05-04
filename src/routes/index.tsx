import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { GraduationCap, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { generateMockTrainingData } from "@/lib/mock-training-data";
import { applyFilters, computeKpis, uniqueOptions } from "@/lib/training-analytics";
import { EMPTY_FILTERS, type Filters, type TrainingRecord } from "@/lib/training-types";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CategoryChart, TrendChart } from "@/components/dashboard/Charts";
import { ManagerPerformance } from "@/components/dashboard/ManagerPerformance";
import { AtRiskTable } from "@/components/dashboard/AtRiskTable";
import { DataSourceBar } from "@/components/dashboard/DataSourceBar";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "L&D Dashboard — Training Compliance & Manager Insights" },
      {
        name: "description",
        content:
          "Manager-facing Learning & Development dashboard tracking completion rates, overdue trainings, manager performance and at-risk employees from Skillsoft Percipio data.",
      },
    ],
  }),
});

const MOCK = generateMockTrainingData();

function Dashboard() {
  const [data, setData] = useState<TrainingRecord[]>(MOCK);
  const [isUsingMock, setIsUsingMock] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const options = useMemo(
    () => ({
      managers: uniqueOptions(data, "managerName"),
      departments: uniqueOptions(data, "department"),
      categories: uniqueOptions(data, "courseCategory"),
      trainingTypes: uniqueOptions(data, "trainingType"),
      statuses: uniqueOptions(data, "status"),
    }),
    [data],
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* Corporate hero header */}
      <header className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(oklch(1_0_0/0.5)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.5)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent-brand/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-info/20 blur-3xl" />
        <div className="relative max-w-[1400px] mx-auto px-6 py-7 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="icon-3d icon-3d-brand h-12 w-12 shadow-glow-brand">
              <GraduationCap className="h-6 w-6 relative z-10" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60 mb-1">
                Skillsoft Percipio · Manager Console
              </div>
              <h1 className="text-xl font-semibold tracking-tight leading-tight">
                Learning &amp; Development Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-primary-foreground/60 uppercase tracking-wider text-[10px]">Last sync</span>
              <span className="font-medium tabular-nums">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-primary-foreground/60 uppercase tracking-wider text-[10px]">Reporting period</span>
              <span className="font-medium">Trailing 12 months</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-7 flex flex-col gap-6">
        <DataSourceBar
          isUsingMock={isUsingMock}
          recordCount={data.length}
          onLoad={(records) => {
            setData(records);
            setIsUsingMock(false);
            setFilters(EMPTY_FILTERS);
          }}
          onReset={() => {
            setData(MOCK);
            setIsUsingMock(true);
            setFilters(EMPTY_FILTERS);
          }}
        />

        <FilterBar filters={filters} setFilters={setFilters} options={options} />

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total Assigned"
            value={kpis.totalAssigned.toLocaleString()}
            sublabel="trainings"
            formula="COUNT(records)"
            tone="primary"
            icon={<GraduationCap />}
          />
          <KpiCard
            label="Completed"
            value={kpis.completed.toLocaleString()}
            sublabel="trainings"
            formula="COUNT(status = 'Completed')"
            tone="success"
            icon={<CheckCircle2 />}
          />
          <KpiCard
            label="Completion Rate"
            value={`${kpis.completionRate.toFixed(1)}%`}
            formula="Completed ÷ Total Assigned"
            rate={kpis.completionRate}
            tone="info"
            icon={<TrendingUp />}
          />
          <KpiCard
            label="Overdue"
            value={kpis.overdueCount.toLocaleString()}
            sublabel="needs action"
            formula="Due Date < Today AND ≠ Completed"
            invertLight
            rawCount={kpis.overdueCount}
            invertThresholds={{ red: 50, yellow: 10 }}
            tone="danger"
            icon={<AlertTriangle />}
          />
          <KpiCard
            label="Mandatory Compliance"
            value={`${kpis.mandatoryComplianceRate.toFixed(1)}%`}
            formula="Mandatory Completed ÷ Mandatory Assigned"
            rate={kpis.mandatoryComplianceRate}
            tone="warning"
            icon={<ShieldCheck />}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryChart data={filtered} />
          <TrendChart data={filtered} />
        </section>

        {/* Manager performance */}
        <section>
          <ManagerPerformance data={filtered} />
        </section>

        {/* At-risk table */}
        <section>
          <AtRiskTable data={filtered} />
        </section>

        <footer className="text-center text-xs text-muted-foreground py-6 border-t">
          Built for L&D managers • Traffic light: <span className="text-danger font-medium">red &lt; 60%</span> ·{" "}
          <span className="text-warning font-medium">yellow 60–80%</span> ·{" "}
          <span className="text-success font-medium">green &gt; 80%</span>
        </footer>
      </main>
    </div>
  );
}
