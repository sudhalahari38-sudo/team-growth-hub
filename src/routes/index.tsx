import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  GraduationCap,
  RefreshCw,
  Upload,
  Download,
  RotateCcw,
  Database,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseTrainingCsv, SAMPLE_CSV } from "@/lib/csv-parser";
import { generateMockTrainingData } from "@/lib/mock-training-data";
import { generateMockFeedback } from "@/lib/mock-feedback-data";
import { applyFilters, computeKpis, uniqueOptions } from "@/lib/training-analytics";
import { EMPTY_FILTERS, type Filters, type TrainingRecord } from "@/lib/training-types";
import type { FeedbackRecord } from "@/lib/feedback-types";
import {
  applyRls,
  buildIdentities,
  ADMIN_IDENTITY,
  canAdminister,
  canViewOrg,
  type Identity,
} from "@/lib/current-user";
// KpiCard no longer used on overview
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { CategoryChart } from "@/components/dashboard/Charts";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { AtRiskTable } from "@/components/dashboard/AtRiskTable";
import { DashboardTabs, type DashboardView } from "@/components/dashboard/DashboardTabs";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { ManagerDrillDown } from "@/components/dashboard/ManagerDrillDown";
import { CoursesTab } from "@/components/dashboard/CoursesTab";
import { ForecastTab } from "@/components/dashboard/ForecastTab";
import { FeedbackTab } from "@/components/dashboard/FeedbackTab";
import { LeadershipDashboard } from "@/components/dashboard/LeadershipDashboard";
import { IdentitySwitcher } from "@/components/dashboard/IdentitySwitcher";
import { SettingsMenu } from "@/components/dashboard/SettingsMenu";
import { syncPercipio } from "@/lib/percipio.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "L&D Dashboard — Training Compliance & Manager Insights" },
      {
        name: "description",
        content:
          "Manager-facing Learning & Development dashboard tracking completion rates, overdue trainings, manager performance and at-risk employees from Skillsoft LMS data.",
      },
    ],
  }),
});

const MOCK = generateMockTrainingData();
const MOCK_FEEDBACK = generateMockFeedback(MOCK);
// Auto-sync interval (15 min)
const AUTO_SYNC_MS = 15 * 60 * 1000;

function Dashboard() {
  const [data, setData] = useState<TrainingRecord[]>(MOCK);
  const [isUsingMock, setIsUsingMock] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>(MOCK_FEEDBACK);
  const [feedbackIsMock, setFeedbackIsMock] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<DashboardView>("overview");
  const [drillManager, setDrillManager] = useState<string | null>(null);
  const [atRiskDefault, setAtRiskDefault] = useState<"all" | "critical">("all");
  const [identity, setIdentity] = useState<Identity>(ADMIN_IDENTITY);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const syncedOnceRef = useRef(false);

  const isAdmin = canAdminister(identity);
  const isOrg = canViewOrg(identity);

  // Identities derived from full dataset
  const identities = useMemo(() => buildIdentities(data), [data]);

  // RLS gate: managers see only their own team; admin & leadership see all
  const visibleData = useMemo(() => applyRls(data, identity), [data, identity]);
  const visibleFeedback = useMemo(
    () => (isOrg
      ? feedback
      : feedback.filter((f) => f.managerName === identity.managerName)),
    [feedback, identity, isOrg],
  );

  const filtered = useMemo(() => applyFilters(visibleData, filters), [visibleData, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const options = useMemo(
    () => ({
      managers: uniqueOptions(visibleData, "managerName"),
      departments: uniqueOptions(visibleData, "department"),
      categories: uniqueOptions(visibleData, "courseCategory"),
      trainingTypes: uniqueOptions(visibleData, "trainingType"),
      statuses: uniqueOptions(visibleData, "status"),
      courseNames: uniqueOptions(visibleData, "courseName"),
    }),
    [visibleData],
  );

  // Manager identities also constrain the manager filter
  const managerLockedToSelf = identity.role === "manager";
  useEffect(() => {
    if (managerLockedToSelf && filters.manager !== "all" && filters.manager !== identity.managerName) {
      setFilters({ ...filters, manager: "all" });
    }
  }, [identity, managerLockedToSelf]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSync = async (silent = false) => {
    setSyncing(true);
    try {
      const res = await syncPercipio();
      if (res.error) {
        if (!silent) toast.error(`LMS sync failed: ${res.error}`);
      } else if (res.records.length) {
        setData(res.records);
        setIsUsingMock(false);
        setLastSync(new Date());
        if (!silent) toast.success(`Synced ${res.records.length} records from LMS`);
      } else if (!silent) {
        toast.info("LMS returned no records");
      }
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Scheduled background sync
  useEffect(() => {
    if (!autoSync) return;
    // initial silent sync once per mount
    if (!syncedOnceRef.current) {
      syncedOnceRef.current = true;
      runSync(true);
    }
    const id = window.setInterval(() => runSync(true), AUTO_SYNC_MS);
    return () => window.clearInterval(id);
  }, [autoSync]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = async (file: File) => {
    const text = await file.text();
    const result = parseTrainingCsv(text);
    if (result.errors.length) return toast.error(result.errors.join(" "));
    if (!result.records.length) return toast.error("No valid rows found in the CSV.");
    setData(result.records);
    setIsUsingMock(false);
    setFilters(EMPTY_FILTERS);
    toast.success(`Loaded ${result.records.length} training records from CSV`);
  };
  const handleReset = () => {
    setData(MOCK);
    setIsUsingMock(true);
    setFilters(EMPTY_FILTERS);
  };
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lms-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };


  const goToCritical = () => {
    setAtRiskDefault("critical");
    setView("at-risk");
  };
  const goToManager = (name: string) => {
    setDrillManager(name);
    setView("managers");
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

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
                Skillsoft LMS · Manager Console
              </div>
              <h1 className="text-xl font-semibold tracking-tight leading-tight">
                Learning &amp; Development Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={cn(
                "hidden sm:inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-[11px] font-medium text-primary-foreground/80",
              )}
              title={isUsingMock ? "Sample dataset" : "Uploaded / synced CSV"}
            >
              {isUsingMock ? (
                <Sparkles className="h-3.5 w-3.5" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              {isUsingMock ? "Sample data" : "Live data"}
              <span className="tabular-nums text-primary-foreground">
                {visibleData.length.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSync((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-primary-foreground/10",
                autoSync ? "text-success" : "text-primary-foreground/60",
              )}
              title="Toggle scheduled background sync (every 15 min)"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", autoSync ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              Auto-sync {autoSync ? "On" : "Off"}
            </button>
            <div className="hidden md:flex flex-col items-end text-xs">
              <span className="text-primary-foreground/60 uppercase tracking-wider text-[10px]">
                Last sync
              </span>
              <span className="font-medium tabular-nums">
                {lastSync.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                {syncing && <RefreshCw className="inline ml-1 h-3 w-3 animate-spin" />}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-8"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runSync(false)}
              disabled={syncing}
              className="h-8"
              title="Sync LMS API"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
              Sync
            </Button>
            {!isUsingMock && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-8 text-primary-foreground hover:bg-primary-foreground/10"
                title="Reset to sample data"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={downloadSample}
              className="h-8 text-primary-foreground/80 hover:bg-primary-foreground/10"
              title="Download sample CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <SettingsMenu canManage={identity.role === "leadership"} />
            <IdentitySwitcher
              identity={identity}
              identities={identities}
              onChange={setIdentity}
            />
          </div>
        </div>
        {/* Tabs */}
        <div className="relative max-w-[1400px] mx-auto px-6 pb-3">
          <div className="rounded-xl bg-card/95 backdrop-blur p-1 shadow-sm">
            <DashboardTabs active={view} onChange={setView} />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-7 flex flex-col gap-6">
        {view !== "feedback" && (
          <ControlPanel
            filters={filters}
            setFilters={setFilters}
            options={options}
            hideManagerFilter={managerLockedToSelf}
          />
        )}

        {view === "overview" && (
          <>
            <ExecutiveSummary data={filtered} />

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CategoryChart data={filtered} />
              <RecommendedActions
                data={filtered}
                onViewCritical={goToCritical}
                onDrillBottomManager={goToManager}
              />
            </section>
          </>
        )}

        {view === "managers" && (
          <ManagerDrillDown
            data={filtered}
            drillManager={drillManager}
            setDrillManager={setDrillManager}
            identity={identity}
          />
        )}

        {view === "at-risk" && (
          <AtRiskTable data={filtered} defaultBucket={atRiskDefault} />
        )}

        {view === "courses" && <CoursesTab data={filtered} />}

        {view === "forecast" && <ForecastTab data={filtered} />}

        {view === "feedback" && (
          <FeedbackTab
            data={visibleFeedback}
            isUsingMock={feedbackIsMock}
            onLoad={(rs) => {
              setFeedback(rs);
              setFeedbackIsMock(false);
            }}
            onReset={() => {
              setFeedback(MOCK_FEEDBACK);
              setFeedbackIsMock(true);
            }}
          />
        )}

        <footer className="text-center text-xs text-muted-foreground py-6 border-t">
          {identity.role === "manager" && (
            <div className="mb-2 text-[11px] text-muted-foreground/80">
              Row-level security active · viewing {identity.managerName}'s team only
            </div>
          )}
          Built for L&D managers • Traffic light:{" "}
          <span className="text-danger font-medium">red &lt; 60%</span> ·{" "}
          <span className="text-warning font-medium">yellow 60–80%</span> ·{" "}
          <span className="text-success font-medium">green &gt; 80%</span>
        </footer>
      </main>
    </div>
  );
}
