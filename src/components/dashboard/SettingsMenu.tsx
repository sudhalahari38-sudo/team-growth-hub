import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings, FileText } from "lucide-react";
import { useDashboardSettings } from "@/lib/dashboard-settings";
import { toast } from "sonner";

export function SettingsMenu({ canManage }: { canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const { settings, update } = useDashboardSettings();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
          title="Dashboard settings"
        >
          <Settings className="h-3 w-3" />
          Settings
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
          <DialogDescription>
            {canManage
              ? "Administrators control which features are visible to users."
              : "Read-only view. Only administrators can change these settings."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <div className="icon-3d icon-3d-info h-9 w-9 shrink-0">
              <FileText className="h-4 w-4 relative z-10" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Transcripts</span>
              <span className="text-xs text-muted-foreground">
                Enable transcript generation and viewing for supported recordings,
                meetings, and feedback conversations. When disabled, transcript
                features are hidden across the dashboard.
              </span>
            </div>
          </div>
          <Switch
            checked={settings.transcriptEnabled}
            disabled={!canManage}
            onCheckedChange={(v) => {
              update({ transcriptEnabled: v });
              toast.success(`Transcripts ${v ? "enabled" : "disabled"}`);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
