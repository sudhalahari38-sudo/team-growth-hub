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
  canAdminister,
  canViewOrg,
  identityForViewer,
  loadAccount,
  saveAccount,
  type Account,
  type Identity,
  type IdentityRole,
} from "@/lib/current-user";

// KpiCard no longer used on overview
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { CategoryChart } from "@/components/dashboard/Charts";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { AtRiskTable } from "@/components/dashboard/AtRiskTable";
import { DashboardTabs, type DashboardView, defaultViewForRole, tabsForRole } from "@/components/dashboard/DashboardTabs";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { ManagerDrillDown } from "@/components/dashboard/ManagerDrillDown";
import { CoursesTab } from "@/components/dashboard/CoursesTab";
import { FeedbackTab } from "@/components/dashboard/FeedbackTab";
import { LeadershipDashboard } from "@/components/dashboard/LeadershipDashboard";
import { TrainingCentricDashboard } from "@/components/dashboard/TrainingCentricDashboard";

import { ViewerSwitcher } from "@/components/dashboard/ViewerSwitcher";
import { LoginScreen } from "@/components/dashboard/LoginScreen";

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
  const [account, setAccount] = useState<Account | null>(null);
  const [viewer, setViewer] = useState<IdentityRole>("admin");
  const [impersonatedManager, setImpersonatedManager] = useState<string>("");
  /** Manager view scope: own reporting hierarchy vs read-only org-wide */
  const [teamScope, setTeamScope] = useState<"team" | "org">("team");
  /** Within "My team": all, direct-only, or indirect-only reportees */
  const [teamLevel, setTeamLevel] = useState<TeamLevel>("all");
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const syncedOnceRef = useRef(false);

  // Restore session
  useEffect(() => {
    const a = loadAccount();
    if (a) {
      setAccount(a);
      setViewer(a.role);
      if (a.managerName) setImpersonatedManager(a.managerName);
    }
  }, []);

  // Identities derived from full dataset
  const identities = useMemo(() => buildIdentities(data), [data]);
  const managerNames = useMemo(
    () => identities.filter((i) => i.role === "manager").map((i) => i.name),
    [identities],
  );

  const identity: Identity = useMemo(
    () =>
      account
        ? identityForViewer(account, viewer, impersonatedManager || managerNames[0])
        : { id: "admin", name: "Admin (full access)", role: "admin" },
    [account, viewer, impersonatedManager, managerNames],
  );

  const isAdmin = canAdminister(identity);
  const isOrg = canViewOrg(identity);
  const isManagerView = identity.role === "manager";
  const orgReadOnly = isManagerView && teamScope === "org";

  // RLS gate: manager view sees own team; "Organization" scope is read-only org-wide
  const teamData = useMemo(
    () => (orgReadOnly ? data : applyRls(data, identity)),
    [data, identity, orgReadOnly],
  );

  // Direct vs indirect split within "My team"
  const teamCounts = useMemo(() => {
    const leader = identity.managerName;
    const direct = teamData.filter((r) => reportingLine(r, leader) === "direct");
    const indirect = teamData.filter((r) => reportingLine(r, leader) === "indirect");
    return { all: teamData.length, direct: direct.length, indirect: indirect.length };
  }, [teamData, identity.managerName]);

  const visibleData = useMemo(
    () =>
      isManagerView && !orgReadOnly
        ? filterByTeamLevel(teamData, identity.managerName, teamLevel)
        : teamData,
    [teamData, identity.managerName, isManagerView, orgReadOnly, teamLevel],
  );

  const visibleFeedback = useMemo(() => {
    if (isOrg || orgReadOnly) return feedback;
    const team = teamRows(feedback, identity.managerName);
    return filterByTeamLevel(team, identity.managerName, teamLevel);
  }, [feedback, identity, isOrg, orgReadOnly, teamLevel]);


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

  // When identity changes, snap to the default view for that role if current is not allowed
  useEffect(() => {
    const allowed = tabsForRole(identity.role).map((t) => t.id);
    if (!allowed.includes(view)) {
      setView(defaultViewForRole(identity.role));
    }
  }, [identity, view]);

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

  if (!account) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <LoginScreen
          managerNames={managerNames}
          onLogin={(a) => {
            saveAccount(a);
            setAccount(a);
            setViewer(a.role);
            setTeamScope("team");
            if (a.managerName) setImpersonatedManager(a.managerName);
            setView(defaultViewForRole(a.role));
          }}
        />
      </>
    );
  }

  return (

    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      <header className="sticky top-0 z-30 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Skillsoft LMS · Console
              </div>
              <h1 className="truncate text-base sm:text-lg font-semibold tracking-tight text-foreground">
                Learning &amp; Development
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div
              className={cn(
                "hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground",
              )}
              title={isUsingMock ? "Sample dataset" : "Uploaded / synced CSV"}
            >
              {isUsingMock ? (
                <Sparkles className="h-3.5 w-3.5 text-accent-brand" />
              ) : (
                <Database className="h-3.5 w-3.5 text-success" />
              )}
              <span className="text-foreground">{isUsingMock ? "Sample" : "Live"}</span>
              <span className="tabular-nums text-muted-foreground">
                {visibleData.length.toLocaleString()}
              </span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAutoSync((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-accent",
                  autoSync ? "text-success" : "text-muted-foreground",
                )}
                title="Toggle scheduled background sync (every 15 min)"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", autoSync ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                Auto-sync {autoSync ? "On" : "Off"}
              </button>
            )}
            {isAdmin && (
              <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground">
                <span className="uppercase tracking-wider text-[10px]">Last sync</span>
                <span className="font-medium tabular-nums text-foreground">
                  {lastSync.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {syncing && <RefreshCw className="inline ml-1 h-3 w-3 animate-spin" />}
                </span>
              </div>
            )}
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
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload CSV
                </Button>
                <Button
                  size="sm"
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
                    className="h-8"
                    title="Reset to sample data"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={downloadSample}
                  className="h-8"
                  title="Download sample CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <SettingsMenu canManage={isAdmin} />
              </>
            )}
            {account && (
              <ViewerSwitcher
                account={account}
                viewer={viewer}
                onViewerChange={(r) => {
                  setViewer(r);
                  setTeamScope("team");
                }}
                managerNames={managerNames}
                impersonatedManager={impersonatedManager || managerNames[0]}
                onImpersonateManager={setImpersonatedManager}
                onLogout={() => {
                  saveAccount(null);
                  setAccount(null);
                }}
              />
            )}

          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6">
          <DashboardTabs active={view} onChange={setView} role={identity.role} />
        </div>
      </header>



      <main className="max-w-[1400px] mx-auto px-6 py-7 flex flex-col gap-6">
        {isManagerView && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
              {(["team", "org"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTeamScope(s)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    teamScope === s
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "team" ? "My team" : "Organization"}
                </button>
              ))}
            </div>

            {teamScope === "team" && (
              <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                {(
                  [
                    ["all", `All (${teamCounts.all})`],
                    ["direct", `Direct (${teamCounts.direct})`],
                    ["indirect", `Indirect (${teamCounts.indirect})`],
                  ] as const
                ).map(([lvl, lbl]) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setTeamLevel(lvl)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      teamLevel === lvl
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}

            <span className="text-[11px] text-muted-foreground">
              {teamScope === "org"
                ? "Organization-wide training data · read-only"
                : teamLevel === "direct"
                  ? `Employees reporting directly to ${identity.managerName}`
                  : teamLevel === "indirect"
                    ? `Employees under ${identity.managerName}'s reporting managers`
                    : `Direct & indirect reportees of ${identity.managerName}`}
            </span>
          </div>
        )}


        {view !== "feedback" && (
          <ControlPanel
            filters={filters}
            setFilters={setFilters}
            options={options}
            hideManagerFilter={managerLockedToSelf}
            variant={isAdmin ? "full" : "simple"}
          />
        )}

        {view === "training" && !isAdmin && (
          <TrainingCentricDashboard
            data={filtered}
            feedback={visibleFeedback}
            identity={identity}
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

        {view === "leadership" && isOrg && (
          <LeadershipDashboard
            data={filtered}
            onDrillDepartment={(dept) => {
              setFilters({ ...filters, department: dept });
              setView("overview");
            }}
          />
        )}

        {view === "managers" && isOrg && (
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
