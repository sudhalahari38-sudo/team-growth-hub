/**
 * Tiered nudge email templates for overdue training.
 *
 * Eligibility is driven purely by how many days a training is overdue:
 *   reminder   →  1–15 days
 *   warning    → 16–30 days
 *   escalation → 31+ days
 */

export type NudgeTier = "reminder" | "warning" | "escalation";

export interface NudgeTierMeta {
  tier: NudgeTier;
  label: string;
  range: string;
  min: number;
  max: number; // Infinity for escalation
  /** semantic tone → green / amber / red */
  tone: "success" | "warning" | "danger";
  description: string;
}

export const NUDGE_TIERS: NudgeTierMeta[] = [
  {
    tier: "reminder",
    label: "Reminder Nudge",
    range: "1–15 days overdue",
    min: 1,
    max: 15,
    tone: "success",
    description: "Friendly reminder to complete the training.",
  },
  {
    tier: "warning",
    label: "Warning Nudge",
    range: "16–30 days overdue",
    min: 16,
    max: 30,
    tone: "warning",
    description: "Formal warning — completion is significantly late.",
  },
  {
    tier: "escalation",
    label: "Escalation Nudge",
    range: "31+ days overdue",
    min: 31,
    max: Infinity,
    tone: "danger",
    description: "Escalated to manager and HR — compliance risk.",
  },
];

export function tierForDays(days: number): NudgeTier | null {
  const m = NUDGE_TIERS.find((t) => days >= t.min && days <= t.max);
  return m ? m.tier : null;
}

export function isTierEligible(tier: NudgeTier, days: number): boolean {
  const m = NUDGE_TIERS.find((t) => t.tier === tier)!;
  return days >= m.min && days <= m.max;
}

export function ineligibleReason(tier: NudgeTier, days: number): string {
  const m = NUDGE_TIERS.find((t) => t.tier === tier)!;
  if (days < m.min) {
    return `Available only when training is ${m.range}. This training is ${days} day${
      days === 1 ? "" : "s"
    } overdue.`;
  }
  return `No longer applicable — training is ${days} days overdue. Use a higher-severity nudge.`;
}

export const TONE_CLASSES: Record<
  NudgeTierMeta["tone"],
  { dot: string; chip: string; ring: string; btn: string }
> = {
  success: {
    dot: "bg-success",
    chip: "bg-success/10 text-success",
    ring: "ring-success/40",
    btn: "bg-success text-white hover:bg-success/90",
  },
  warning: {
    dot: "bg-warning",
    chip: "bg-warning/15 text-warning",
    ring: "ring-warning/40",
    btn: "bg-warning text-white hover:bg-warning/90",
  },
  danger: {
    dot: "bg-danger",
    chip: "bg-danger/10 text-danger",
    ring: "ring-danger/40",
    btn: "bg-danger text-white hover:bg-danger/90",
  },
};

export interface NudgeContext {
  employeeName: string;
  managerName?: string;
  courseName: string;
  dueDate: string;
  daysOverdue: number;
  trainingUrl?: string;
}

export interface RenderedNudge {
  subject: string;
  body: string;
}

export function trainingLink(courseName: string) {
  return `https://lms.company.com/training/${encodeURIComponent(
    courseName.toLowerCase().replace(/\s+/g, "-"),
  )}`;
}

export function renderNudge(tier: NudgeTier, c: NudgeContext): RenderedNudge {
  const link = c.trainingUrl ?? trainingLink(c.courseName);
  const facts = [
    `Training: ${c.courseName}`,
    `Due date: ${c.dueDate}`,
    `Days overdue: ${c.daysOverdue}`,
    `Access the training: ${link}`,
  ].join("\n");

  if (tier === "reminder") {
    return {
      subject: `Reminder: "${c.courseName}" is ${c.daysOverdue} day${
        c.daysOverdue === 1 ? "" : "s"
      } overdue`,
      body: `Hi ${c.employeeName},

This is a friendly reminder that your assigned training is past its due date. Please set aside some time this week to complete it.

${facts}

Thanks,
${c.managerName ?? "Learning & Development"}`,
    };
  }

  if (tier === "warning") {
    return {
      subject: `Action required: "${c.courseName}" is ${c.daysOverdue} days overdue`,
      body: `Hi ${c.employeeName},

Your assigned training remains incomplete ${c.daysOverdue} days after its due date. Please complete it within the next 5 working days to avoid escalation.

${facts}

Regards,
${c.managerName ?? "Learning & Development"}`,
    };
  }

  return {
    subject: `Escalation: "${c.courseName}" overdue by ${c.daysOverdue} days`,
    body: `Hi ${c.employeeName},

Your assigned training is now ${c.daysOverdue} days overdue and has been escalated to your manager and HR as a compliance risk. Immediate completion is required.

${facts}

This notice has been recorded in your training history.

Regards,
${c.managerName ?? "Learning & Development"}`,
  };
}
