import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Bell, History, Info, Lock, Send } from "lucide-react";
import { sendNudge } from "@/lib/nudge.functions";
import {
  NUDGE_TIERS,
  TONE_CLASSES,
  isTierEligible,
  ineligibleReason,
  renderNudge,
  tierForDays,
  trainingLink,
  type NudgeTier,
} from "@/lib/nudge-templates";
import { historyFor, logNudge } from "@/lib/nudge-history";

export interface NudgeTarget {
  employeeId: string;
  employeeName: string;
  managerName?: string;
  courseName: string;
  dueDate: string;
  daysOverdue: number;
  email?: string;
}

export function NudgeDialog({
  open,
  onOpenChange,
  target,
  sentBy = "Manager",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: NudgeTarget | null;
  sentBy?: string;
}) {
  const nudgeFn = useServerFn(sendNudge);
  const [tier, setTier] = useState<NudgeTier | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const suggested = target ? tierForDays(target.daysOverdue) : null;
  const active = tier ?? suggested;

  const preview = useMemo(
    () =>
      target && active
        ? renderNudge(active, {
            employeeName: target.employeeName,
            managerName: target.managerName,
            courseName: target.courseName,
            dueDate: target.dueDate,
            daysOverdue: target.daysOverdue,
          })
        : null,
    [target, active],
  );

  const past = target ? historyFor(target.employeeId, target.courseName) : [];

  if (!target) return null;

  const activeMeta = NUDGE_TIERS.find((t) => t.tier === active);

  async function send() {
    if (!target || !active || !preview) return;
    setSending(true);
    try {
      const res = await nudgeFn({
        data: {
          channel: "email",
          source: `nudge:${active}`,
          tier: active,
          subject: preview.subject,
          body: preview.body,
          recipients: [
            {
              employeeId: target.employeeId,
              employeeName: target.employeeName,
              email: target.email,
              managerName: target.managerName,
              courseName: target.courseName,
              daysOverdue: target.daysOverdue,
            },
          ],
        },
      });
      if (res.success) {
        logNudge({
          id: res.reminderId,
          employeeId: target.employeeId,
          employeeName: target.employeeName,
          courseName: target.courseName,
          tier: active,
          daysOverdue: target.daysOverdue,
          subject: preview.subject,
          sentAt: res.sentAt,
          sentBy,
          channel: res.channel,
        });
        toast.success(`${activeMeta?.label} sent to ${target.employeeName}`, {
          description: `Logged to training history (${res.reminderId}).`,
        });
        onOpenChange(false);
        setConfirming(false);
        setTier(null);
      } else {
        toast.error("Nudge failed", { description: res.errors[0]?.reason ?? "Unknown error" });
      }
    } catch (err) {
      toast.error("Nudge failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setConfirming(false);
          setTier(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Send nudge — {target.employeeName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {target.courseName} · due {target.dueDate} ·{" "}
            <span className="font-semibold text-danger">{target.daysOverdue} days overdue</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {NUDGE_TIERS.map((t) => {
            const eligible = isTierEligible(t.tier, target.daysOverdue);
            const selected = active === t.tier;
            const tc = TONE_CLASSES[t.tone];
            return (
              <button
                key={t.tier}
                type="button"
                disabled={!eligible}
                title={eligible ? t.description : ineligibleReason(t.tier, target.daysOverdue)}
                onClick={() => {
                  setTier(t.tier);
                  setConfirming(false);
                }}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2.5 transition-all",
                  selected
                    ? cn("border-transparent ring-2", tc.ring, "bg-secondary/50")
                    : "border-border/70 hover:bg-secondary/40",
                  !eligible && "opacity-50 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", tc.dot)} />
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      tc.chip,
                    )}
                  >
                    {t.range}
                  </span>
                </div>
                <p className="mt-1 pl-4.5 text-[11px] text-muted-foreground flex items-start gap-1">
                  {!eligible && <Lock className="h-3 w-3 mt-0.5 shrink-0" />}
                  {eligible ? t.description : ineligibleReason(t.tier, target.daysOverdue)}
                </p>
              </button>
            );
          })}
        </div>

        {preview && (
          <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Email preview
            </div>
            <div className="mt-1.5 text-xs font-semibold text-foreground">{preview.subject}</div>
            <pre className="mt-1.5 whitespace-pre-wrap font-sans text-[11px] leading-snug text-muted-foreground">
              {preview.body}
            </pre>
            <a
              href={trainingLink(target.courseName)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-primary underline"
            >
              Open training link
            </a>
          </div>
        )}

        {past.length > 0 && (
          <div className="rounded-lg border border-border/60 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3 w-3" /> Nudge history ({past.length})
            </div>
            <ul className="mt-1.5 space-y-1">
              {past.slice(0, 4).map((h) => (
                <li key={h.id} className="text-[11px] text-muted-foreground">
                  <span className="font-semibold capitalize text-foreground">{h.tier}</span> ·{" "}
                  {new Date(h.sentAt).toLocaleString()} · by {h.sentBy}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {confirming ? (
            <>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Send this {activeMeta?.label.toLowerCase()} to {target.employeeName}?
              </div>
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sending}
                className={activeMeta ? TONE_CLASSES[activeMeta.tone].btn : undefined}
                onClick={send}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {sending ? "Sending…" : "Confirm & send"}
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={!active} onClick={() => setConfirming(true)}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Send {activeMeta?.label ?? "nudge"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
