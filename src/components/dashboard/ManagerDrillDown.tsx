import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TrainingRecord } from "@/lib/training-types";
import {
  managerPerformance,
  trafficLight,
  lightClasses,
  atRiskEmployees,
} from "@/lib/training-analytics";
import { ManagerPerformance } from "./ManagerPerformance";
import { AtRiskTable } from "./AtRiskTable";
import { ArrowLeft, Mail, Download, Users, FileText, FileSpreadsheet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LEADERSHIP_IDENTITY, type Identity } from "@/lib/current-user";
import {
  canExportTeamTranscript,
  exportTeamTranscriptCsv,
  exportTeamTranscriptPdf,
} from "@/lib/transcript-export";

function avatarGradient(name: string) {
  const palettes = [
    "linear-gradient(135deg, oklch(0.62 0.16 235), oklch(0.55 0.18 270))",
    "linear-gradient(135deg, oklch(0.66 0.16 150), oklch(0.6 0.18 180))",
    "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.58 0.21 15))",
    "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.72 0.18 55))",
    "linear-gradient(135deg, oklch(0.55 0.18 300), oklch(0.5 0.2 320))",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}
function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function ManagerDrillDown({
  data,
  drillManager,
  setDrillManager,
  identity = LEADERSHIP_IDENTITY,
}: {
  data: TrainingRecord[];
  drillManager: string | null;
  setDrillManager: (m: string | null) => void;
  identity?: Identity;
}) {
  const rows = managerPerformance(data);
  const orgAvg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.completionRate, 0) / rows.length)
    : 0;

  if (!drillManager) {
    return <ManagerPerformance data={data} onDrill={(m) => setDrillManager(m)} />;
  }

  const m = rows.find((r) => r.manager === drillManager);
  if (!m) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Manager not found.{" "}
        <button className="text-info underline" onClick={() => setDrillManager(null)}>
          Back
        </button>
      </Card>
    );
  }

  const allowedTranscript = canExportTeamTranscript(identity, m.manager);
  const handleTranscript = (format: "csv" | "pdf") => {
    if (!allowedTranscript) {
      toast.error("You can only export transcripts for your own team.");
      return;
    }
    try {
      const count =
        format === "csv"
          ? exportTeamTranscriptCsv(data, m.manager)
          : exportTeamTranscriptPdf(data, m.manager);
      toast.success(
        `Downloaded ${format.toUpperCase()} transcript · ${count} records for ${m.manager}'s team`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const lc = lightClasses(trafficLight(m.completionRate));
  const delta = m.completionRate - orgAvg;
  const teamOverdue = atRiskEmployees(data).filter((r) => r.managerName === m.manager).length;

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setDrillManager(null)}
        className="inline-flex items-center gap-1 text-xs font-bold text-info hover:underline w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to all managers
      </button>

      <Card className="p-6 border-border/70 shadow-sm bg-gradient-card">
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-card"
            style={{ backgroundImage: avatarGradient(m.manager) }}
          >
            {initials(m.manager)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{m.manager}</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Users className="h-3 w-3" />
              {m.teamSize} reports · {m.assigned} assignments
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => toast.success(`Reminder sent to ${m.manager}'s team`)}
            >
              <Mail className="h-3.5 w-3.5 mr-1" />
              Send team reminder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Exporting team report…")}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <DrillStat label="Completion" value={`${m.completionRate}%`} className={lc.text} />
          <DrillStat
            label="vs Org Avg"
            value={`${delta > 0 ? "+" : ""}${delta}%`}
            className={delta >= 0 ? "text-success" : "text-danger"}
          />
          <DrillStat
            label="Overdue"
            value={String(teamOverdue)}
            className={teamOverdue > 0 ? "text-danger" : "text-success"}
          />
          <DrillStat label="Team Size" value={String(m.teamSize)} className="text-info" />
        </div>
      </Card>

      <AtRiskTable data={data} managerFilter={m.manager} />
    </div>
  );
}

function DrillStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums leading-tight mt-1", className)}>
        {value}
      </div>
    </div>
  );
}
