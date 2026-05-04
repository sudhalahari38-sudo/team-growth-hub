import Papa from "papaparse";
import type { FeedbackRecord } from "./feedback-types";

const ALIASES: Record<keyof Omit<FeedbackRecord, "id">, string[]> = {
  employeeName: ["employee name", "employee", "learner"],
  managerName: ["manager name", "manager"],
  courseName: ["course name", "course", "title"],
  trainerName: ["trainer name", "trainer", "instructor"],
  rating: ["rating", "score", "stars"],
  comments: ["comments", "feedback", "comment"],
  trainingDate: ["training date", "date", "completion date"],
};

function findKey(headers: string[], aliases: string[]) {
  const norm = (s: string) => s.toLowerCase().trim();
  return headers.find((h) => aliases.includes(norm(h)));
}

export interface FeedbackParseResult {
  records: FeedbackRecord[];
  errors: string[];
}

export function parseFeedbackCsv(csv: string): FeedbackParseResult {
  const r = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (!r.data.length) return { records: [], errors: ["CSV is empty."] };
  const headers = Object.keys(r.data[0] ?? {});
  const map: Partial<Record<keyof Omit<FeedbackRecord, "id">, string>> = {};
  (Object.keys(ALIASES) as (keyof typeof ALIASES)[]).forEach((f) => {
    const k = findKey(headers, ALIASES[f]);
    if (k) map[f] = k;
  });
  const required: (keyof typeof ALIASES)[] = [
    "employeeName",
    "courseName",
    "trainerName",
    "rating",
  ];
  const missing = required.filter((f) => !map[f]);
  if (missing.length)
    return { records: [], errors: [`Missing required columns: ${missing.join(", ")}`] };

  const records: FeedbackRecord[] = [];
  r.data.forEach((row, i) => {
    const get = (f: keyof typeof ALIASES) => (map[f] ? row[map[f]!] ?? "" : "");
    const ratingNum = Math.max(1, Math.min(5, Math.round(Number(get("rating")) || 0)));
    if (!ratingNum) return;
    const dateRaw = get("trainingDate");
    const d = dateRaw ? new Date(dateRaw) : null;
    records.push({
      id: `FB${i + 1}`,
      employeeName: get("employeeName").trim(),
      managerName: get("managerName").trim() || "Unassigned",
      courseName: get("courseName").trim(),
      trainerName: get("trainerName").trim(),
      rating: ratingNum as 1 | 2 | 3 | 4 | 5,
      comments: get("comments").trim(),
      trainingDate:
        d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  });
  return { records, errors: [] };
}

export const SAMPLE_FEEDBACK_CSV = `Employee Name,Manager Name,Course Name,Trainer Name,Rating,Comments,Training Date
Alex Patel,Aarti Sharma,Advanced TypeScript,Dr. Anika Rao,5,Excellent session very engaging,2026-02-28
Sam Kim,Aarti Sharma,Data Privacy & GDPR,Marcus Bell,3,Decent content nothing exceptional,2026-03-12
Priya Singh,Brian Cole,Kubernetes Fundamentals,Sofia Hernandez,4,Loved the hands-on exercises,2026-03-20
`;
