import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FREQUENCY_LABELS,
  RECIPIENT_LABELS,
  REPORT_TYPE_LABELS,
  computeNextRun,
  defaultAutomation,
  type AutomationConfig,
  type Frequency,
  type IncludeStatus,
  type RecipientGroup,
  type ReportType,
} from "@/lib/automation-types";
import { NUDGE_TIERS } from "@/lib/nudge-templates";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const INCLUDE_LABELS: Record<IncludeStatus, string> = {
  inProgress: "Current (in progress)",
  completed: "Completed",
  overdue: "Overdue",
  notStarted: "Not started",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-accent-brand bg-accent-brand/10 text-accent-brand"
          : "border-border bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AutomationDialog({
  open,
  onOpenChange,
  initial,
  courses,
  departments,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AutomationConfig | null;
  courses: string[];
  departments: string[];
  onSave: (cfg: AutomationConfig) => void;
}) {
  const [cfg, setCfg] = useState<AutomationConfig>(initial ?? defaultAutomation());

  useEffect(() => {
    if (open) setCfg(initial ?? defaultAutomation());
  }, [open, initial]);

  const set = <K extends keyof AutomationConfig>(k: K, v: AutomationConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const nextRun = useMemo(() => computeNextRun(cfg, new Date()), [cfg]);

  const toggleList = (key: "courses" | "departments", value: string) =>
    setCfg((c) => ({
      ...c,
      [key]: c[key].includes(value) ? c[key].filter((x) => x !== value) : [...c[key], value],
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit automation" : "New automation"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          <div className="grid gap-2">
            <Label>Automation name</Label>
            <Input value={cfg.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Report type</Label>
              <Select
                value={cfg.reportType}
                onValueChange={(v) => set("reportType", v as ReportType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPE_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select value={cfg.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cfg.frequency === "weekly" && (
              <div className="grid gap-2">
                <Label>Day of week</Label>
                <Select
                  value={String(cfg.weekday)}
                  onValueChange={(v) => set("weekday", Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {cfg.frequency === "monthly" && (
              <div className="grid gap-2">
                <Label>Day of month (1–28)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={cfg.monthDay}
                  onChange={(e) => set("monthDay", Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
            )}
            {cfg.frequency === "custom" && (
              <div className="grid gap-2">
                <Label>Run every N days</Label>
                <Input
                  type="number"
                  min={1}
                  value={cfg.intervalDays}
                  onChange={(e) => set("intervalDays", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Delivery time</Label>
              <Input type="time" value={cfg.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Recipients</Label>
            <Select
              value={cfg.recipientGroup}
              onValueChange={(v) => set("recipientGroup", v as RecipientGroup)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RECIPIENT_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cfg.recipientGroup === "custom" && (
              <Input
                placeholder="comma-separated emails"
                value={cfg.customEmails.join(", ")}
                onChange={(e) =>
                  set(
                    "customEmails",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  )
                }
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label>Training scope</Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-lg border border-border p-2">
              <Chip active={cfg.courses.length === 0} onClick={() => set("courses", [])}>
                All courses
              </Chip>
              {courses.map((c) => (
                <Chip key={c} active={cfg.courses.includes(c)} onClick={() => toggleList("courses", c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Department scope</Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2">
              <Chip active={cfg.departments.length === 0} onClick={() => set("departments", [])}>
                All departments
              </Chip>
              {departments.map((d) => (
                <Chip
                  key={d}
                  active={cfg.departments.includes(d)}
                  onClick={() => toggleList("departments", d)}
                >
                  {d}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Include in report</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INCLUDE_LABELS) as IncludeStatus[]).map((k) => (
                <Chip
                  key={k}
                  active={cfg.include[k]}
                  onClick={() => set("include", { ...cfg.include, [k]: !cfg.include[k] })}
                >
                  {INCLUDE_LABELS[k]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <div className="font-medium text-foreground">CSV / Excel attachment</div>
              <div className="text-[11px] text-muted-foreground">
                Email summary is always included
              </div>
            </div>
            <Switch checked={cfg.attachCsv} onCheckedChange={(v) => set("attachCsv", v)} />
          </div>

          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium text-foreground">Automated learner nudges</div>
                <div className="text-[11px] text-muted-foreground">
                  Sent automatically with each run, tier chosen by days overdue
                </div>
              </div>
              <Switch
                checked={cfg.nudgesEnabled}
                onCheckedChange={(v) => set("nudgesEnabled", v)}
              />
            </div>
            {cfg.nudgesEnabled && (
              <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                {NUDGE_TIERS.map((t) => (
                  <Chip
                    key={t.tier}
                    active={cfg.nudgeTiers[t.tier]}
                    onClick={() =>
                      set("nudgeTiers", { ...cfg.nudgeTiers, [t.tier]: !cfg.nudgeTiers[t.tier] })
                    }
                  >
                    {t.label} · {t.range}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-secondary px-3 py-2 text-[11px] text-muted-foreground">
            Next run:{" "}
            <span className="font-medium text-foreground">{nextRun.toLocaleString()}</span> · after
            saving, the system pulls data, cleans it, generates the report, emails recipients and
            sends nudges automatically.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave({ ...cfg, nextRunAt: computeNextRun(cfg, new Date()).toISOString() });
              onOpenChange(false);
            }}
          >
            {initial ? "Save changes" : "Create automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
