# Automated Compliance Reporting & Nudge Engine (Admin View)

Admin configures a schedule once; the app then automatically pulls the latest training data, cleans it, computes compliance metrics, generates the report + CSV, "sends" it to the configured recipients, fires tiered learner nudges, and logs every run. Delivery is simulated for now (runs and sends are recorded in the automation history and nudge audit log) — swapping in real email later is a single send-function change.

## New tab: Automation (Admin only)

Appears in the admin tab bar only; Leadership and Manager views are untouched.

### 1. Automation list
Table of configured automations with: name, report type, frequency, next run, last run, last status, recipients count, nudges sent, error count, Active/Paused toggle.
Row actions: **Run now**, **Edit**, **Pause/Resume**, **View history**, **Delete**.

### 2. Create / Edit automation dialog
- Report type: Compliance / Training Completion / Overdue Training
- Frequency: Daily, Every other day, Weekly (pick weekday), Monthly (pick day), Custom (every N days)
- Delivery time (HH:MM)
- Recipients: Entire organization / Leadership / Managers / specific email list
- Scope: courses (multi-select or all), departments (multi-select or all)
- Include statuses: current (in progress), completed, overdue, not started
- Format: email summary + CSV attachment (toggle CSV)
- Nudges: enable auto-nudge, with per-tier switches (Reminder 1–15d, Warning 16–30d, Escalation 31+d) reusing existing templates

### 3. Run pipeline (visible as 5 steps in the run detail)
1. **Pull** — latest dataset from the LMS sync source (or last uploaded/synced records).
2. **Clean & validate** — drop duplicate employee+course rows, trim/normalize names, drop rows missing employee/course/due date, coerce invalid dates. Counts of removed/repaired rows are recorded.
3. **Analyze** — completion rate, mandatory compliance %, overdue count, at-risk learners, outstanding mandatory courses, by-department breakdown (reuses existing analytics helpers).
4. **Distribute** — renders the email summary and builds the CSV; resolves the recipient list; records the send.
5. **Nudge** — for each overdue learner in scope, picks the tier from days overdue and records one nudge per learner+course into the existing nudge audit log (skips learners already nudged at the same tier for that course).

### 4. Automation history
Chronological log per run: automation name, started/finished time, data period covered, rows in/cleaned, key metrics snapshot, recipients, nudges sent by tier, status (success / failed) with error message. Each row expands to the 5-step breakdown and offers **Download CSV** of that run's report.

## Scheduler behaviour

A single scheduler tick (every 60s while the app is open, plus one catch-up check on load) compares `now` against each active automation's `nextRunAt` and executes any that are due, then rolls `nextRunAt` forward. Missed runs while the app was closed are executed once as a catch-up so the schedule self-heals. Admin never has to trigger anything manually.

## Technical notes

- New `src/lib/automation-types.ts` (schedule + run-log types, next-run calculator), `src/lib/automation-store.ts` (localStorage-backed store with subscribe, mirroring `nudge-history.ts`), `src/lib/automation-engine.ts` (pull → clean → analyze → report → send → nudge), `src/lib/automation-report.ts` (email summary text + CSV builder).
- New UI: `src/components/dashboard/AutomationTab.tsx`, `AutomationDialog.tsx`, `AutomationHistory.tsx`.
- Edits: `DashboardTabs.tsx` (add `automation` admin tab), `src/routes/index.tsx` (render the tab, mount the scheduler hook for admins).
- Reuses `training-analytics.ts`, `nudge-templates.ts`, `nudge-history.ts`, and `nudge.functions.ts` (`sendNudge`) so nudge sends and audit entries match the manual flow exactly.
- No new packages; CSV built with the existing export helpers. No backend changes.

## Limitation to be aware of

Because there is no backend yet, automations run while the dashboard is open (with catch-up for missed windows) and emails are logged rather than delivered. Enabling Lovable Cloud later moves the same engine to a server cron and real email with no UI change.
