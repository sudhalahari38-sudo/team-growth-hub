/**
 * Training Feedback domain.
 *
 * Cloud-ready SQL schema (apply when persistence is enabled):
 *
 *   create table public.training_feedback (
 *     id          uuid primary key default gen_random_uuid(),
 *     employee_name text not null,
 *     manager_name  text not null,
 *     course_name   text not null,
 *     trainer_name  text not null,
 *     rating        smallint not null check (rating between 1 and 5),
 *     comments      text,
 *     training_date date not null,
 *     created_at    timestamptz default now()
 *   );
 *   alter table public.training_feedback enable row level security;
 *   create policy "managers read own team feedback"
 *     on public.training_feedback for select
 *     using (manager_name = current_setting('app.user.manager', true)
 *            or public.has_role(auth.uid(), 'leadership'));
 */
export interface FeedbackRecord {
  id: string;
  employeeName: string;
  managerName: string;
  courseName: string;
  trainerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;
  trainingDate: string; // yyyy-mm-dd
}

export type Sentiment = "positive" | "neutral" | "negative";

export function sentimentOf(rating: number, comments: string): Sentiment {
  const c = comments.toLowerCase();
  const negWords = ["poor", "bad", "boring", "waste", "confusing", "slow", "outdated", "useless"];
  const posWords = ["great", "excellent", "amazing", "loved", "helpful", "clear", "engaging", "useful"];
  const hasNeg = negWords.some((w) => c.includes(w));
  const hasPos = posWords.some((w) => c.includes(w));
  if (rating >= 4 || hasPos) return "positive";
  if (rating <= 2 || hasNeg) return "negative";
  return "neutral";
}
