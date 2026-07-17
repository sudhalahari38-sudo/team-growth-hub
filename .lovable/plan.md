## Goal

Replace the multi-tab experience for Leadership and Manager roles with a single **Training Dashboard**. Each course/training becomes the primary object; at-risk, forecast, feedback, and progress details are embedded as drill-downs on the training row rather than separate tabs. Admin keeps full multi-tab access unchanged.

## What changes

### 1. New component: `TrainingCentricDashboard.tsx`
Single scrollable page composed of four stacked sections:

- **KPI strip** — 6 compact tiles: Total assigned, In Progress, Completed, Overdue, Not Started, Mandatory Compliance %.
- **Trends & mix** — Completion trend line (12 mo) + Mandatory vs Optional donut + Department comparison bar.
- **At-risk banner** — Compact strip listing top employees falling behind (embedded, not a tab).
- **Training list** — Sortable table of every course (name, type, category, assigned, completed, in progress, overdue, completion %). Rows are expandable; expanded panel shows:
  - Per-employee rows: name, manager, status, assigned/due/completion dates, days overdue, learning hours*, score/certification* (\*derived where present, "—" otherwise).
  - Inline feedback snippets for that course (avg rating + last 3 comments) from `FeedbackRecord`.
  - Mini forecast note for that course (projected completion, additional needed for 80%).

### 2. Wire-up in `src/routes/index.tsx`
- Leadership + Manager roles render `<TrainingCentricDashboard data={filtered} feedback={visibleFeedback} identity={identity} />` instead of `LeadershipInsightsPage` / `ManagerTeamPage`.
- Admin experience (all existing tabs, Sync/Upload/Settings) untouched.
- Delete now-unused `ConsolidatedInsights.tsx` imports.

### 3. `DashboardTabs.tsx`
- Leadership + Manager tab arrays already collapse to a single tab and render nothing — keep the guard, just re-point the `defaultViewForRole` values (`training` view id) and drop unused `insights` / `my-team` view types.

### 4. Filters (`ControlPanel` simple variant)
Already limited to Employee Name + Training Name for non-admins — no change needed beyond confirming both filters remain visible.

## Layout sketch

```text
┌──────────────────────────────────────────────────────────┐
│  KPI strip: Assigned  InProg  Completed  Overdue …       │
├──────────────────────────────────────────────────────────┤
│  Completion trend      │  Mandatory/Optional  │  By dept │
├──────────────────────────────────────────────────────────┤
│  ⚠ Falling behind: Jane D., Raj P., … (top 5)            │
├──────────────────────────────────────────────────────────┤
│  Training                Type   Assigned  Done  Overdue  │
│  ▸ Data Privacy 101      Mand    54       48    3   88%  │
│  ▾ Cybersecurity Basics  Mand    62       40    12  64%  │
│      · Alice Kim   In Progress  due 2026-05-20  4h  —    │
│      · Bob Rao    Overdue 12d   due 2026-04-22  —   —    │
│      · Feedback: ★4.2 "clear examples", "too long"       │
│      · Forecast: 8 more completions needed for 80%       │
└──────────────────────────────────────────────────────────┘
```

## Technical notes

- Reuses existing analytics helpers: `computeKpis`, `courseLevelAnalysis`, `atRiskEmployees`, `forecast`, `executiveMetricTrends`.
- Feedback joined by matching `FeedbackRecord.courseName` to the row's course.
- Manager RLS is already applied at `visibleData` — no additional gating needed in the new component.
- No new packages, no backend changes.

## Files

- **Create:** `src/components/dashboard/TrainingCentricDashboard.tsx`
- **Edit:** `src/routes/index.tsx`, `src/components/dashboard/DashboardTabs.tsx`
- **Delete:** `src/components/dashboard/ConsolidatedInsights.tsx` (no longer referenced)
