import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const recipientSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  email: z.string().optional(),
  managerName: z.string().optional(),
  courseName: z.string().optional(),
  daysOverdue: z.number().optional(),
});

const inputSchema = z.object({
  recipients: z.array(recipientSchema).min(1),
  channel: z.enum(["email", "slack", "sms"]).default("email"),
  source: z.string().optional(),
});

export type NudgeRecipient = z.infer<typeof recipientSchema>;
export type NudgeResult = {
  success: boolean;
  sent: number;
  failed: number;
  reminderId: string;
  sentAt: string;
  channel: "email" | "slack" | "sms";
  errors: { employeeId: string; reason: string }[];
};

// In-memory reminder log (replace with DB persistence when Cloud is enabled)
const reminderLog: Array<{
  id: string;
  sentAt: string;
  channel: string;
  source?: string;
  recipients: NudgeRecipient[];
}> = [];

export const sendNudge = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<NudgeResult> => {
    const reminderId = `rmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const sentAt = new Date().toISOString();
    const errors: { employeeId: string; reason: string }[] = [];

    // Simulated dispatch — integrate real provider (Resend, Twilio, Slack) here.
    for (const r of data.recipients) {
      if (data.channel === "email" && r.email && !/^\S+@\S+\.\S+$/.test(r.email)) {
        errors.push({ employeeId: r.employeeId, reason: "invalid email" });
      }
    }

    reminderLog.push({
      id: reminderId,
      sentAt,
      channel: data.channel,
      source: data.source,
      recipients: data.recipients,
    });

    console.log(
      `[nudge] ${reminderId} channel=${data.channel} recipients=${data.recipients.length} source=${data.source ?? "n/a"}`,
    );

    const failed = errors.length;
    return {
      success: failed === 0,
      sent: data.recipients.length - failed,
      failed,
      reminderId,
      sentAt,
      channel: data.channel,
      errors,
    };
  });

export const listReminders = createServerFn({ method: "GET" }).handler(async () => {
  return { reminders: reminderLog.slice(-50).reverse() };
});
