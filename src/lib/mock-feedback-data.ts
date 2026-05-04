import type { FeedbackRecord } from "./feedback-types";
import type { TrainingRecord } from "./training-types";

const trainers = [
  "Dr. Anika Rao",
  "Marcus Bell",
  "Sofia Hernandez",
  "Yuki Tanaka",
  "Olivia Brennan",
  "Rajiv Mehta",
];

const positive = [
  "Excellent session, very engaging and clear examples.",
  "Loved the hands-on exercises — extremely useful.",
  "Great pacing and clear explanations.",
  "Helpful trainer, answered every question in detail.",
];
const neutral = [
  "Decent content, nothing exceptional.",
  "Covered the basics adequately.",
  "Useful in parts, slow in others.",
];
const negative = [
  "Outdated material and confusing slides.",
  "Trainer was hard to follow, content felt boring.",
  "Waste of time for senior team members.",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockFeedback(training: TrainingRecord[]): FeedbackRecord[] {
  const rng = mulberry32(7);
  const completed = training.filter((r) => r.status === "Completed" && r.completionDate);
  // Sample ~40% of completions for feedback
  const out: FeedbackRecord[] = [];
  let id = 1;
  for (const r of completed) {
    if (rng() > 0.4) continue;
    const x = rng();
    let rating: 1 | 2 | 3 | 4 | 5;
    let bucket: string[];
    if (x < 0.55) {
      rating = (4 + Math.floor(rng() * 2)) as 4 | 5;
      bucket = positive;
    } else if (x < 0.85) {
      rating = 3;
      bucket = neutral;
    } else {
      rating = (1 + Math.floor(rng() * 2)) as 1 | 2;
      bucket = negative;
    }
    out.push({
      id: `FB${id++}`,
      employeeName: r.employeeName,
      managerName: r.managerName,
      courseName: r.courseName,
      trainerName: trainers[Math.floor(rng() * trainers.length)],
      rating,
      comments: bucket[Math.floor(rng() * bucket.length)],
      trainingDate: r.completionDate!,
    });
  }
  return out;
}
