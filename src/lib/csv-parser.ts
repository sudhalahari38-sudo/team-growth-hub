import Papa from "papaparse";
import type { TrainingRecord, CourseCategory, TrainingType, TrainingStatus } from "./training-types";

const FIELD_ALIASES: Record<keyof TrainingRecord, string[]> = {
  employeeName: ["employee name", "employee", "learner", "learner name", "user name"],
  employeeId: ["employee id", "user id", "learner id", "id"],
  managerName: ["manager name", "manager", "reports to"],
  department: ["department", "dept", "team"],
  courseName: ["course name", "course", "content title", "title"],
  courseCategory: ["course category", "category"],
  trainingType: ["training type", "type", "mandatory", "assignment type"],
  assignedDate: ["assigned date", "assignment date", "date assigned"],
  dueDate: ["due date", "deadline"],
  completionDate: ["completion date", "completed date", "date completed"],
  status: ["status", "completion status"],
};

function findKey(headers: string[], aliases: string[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  return headers.find((h) => aliases.includes(norm(h)));
}

function normalizeStatus(v: string): TrainingStatus {
  const s = v.toLowerCase().trim();
  if (s.startsWith("complet")) return "Completed";
  if (s.startsWith("in") || s.includes("progress") || s.startsWith("started")) return "In Progress";
  return "Not Started";
}

function normalizeCategory(v: string): CourseCategory {
  const s = v.toLowerCase().trim();
  if (s.includes("compli")) return "Compliance";
  if (s.includes("coach")) return "Coaching";
  if (s.includes("non")) return "Non-Technical";
  if (s.includes("tech")) return "Technical";
  return "Non-Technical";
}

function normalizeType(v: string): TrainingType {
  return v.toLowerCase().includes("mand") ? "Mandatory" : "Optional";
}

function normalizeDate(v: string): string | null {
  if (!v || !v.trim()) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export interface ParseResult {
  records: TrainingRecord[];
  errors: string[];
  missingFields: string[];
}

export function parseTrainingCsv(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!result.data.length) {
    return { records: [], errors: ["CSV is empty or could not be parsed."], missingFields: [] };
  }

  const headers = Object.keys(result.data[0] ?? {});
  const keyMap: Partial<Record<keyof TrainingRecord, string>> = {};
  const missingFields: string[] = [];

  (Object.keys(FIELD_ALIASES) as (keyof TrainingRecord)[]).forEach((field) => {
    const k = findKey(headers, FIELD_ALIASES[field]);
    if (k) keyMap[field] = k;
    else missingFields.push(field);
  });

  const required: (keyof TrainingRecord)[] = ["employeeName", "courseName", "dueDate", "status"];
  const missingRequired = required.filter((r) => missingFields.includes(r));
  if (missingRequired.length) {
    return {
      records: [],
      errors: [`Missing required columns: ${missingRequired.join(", ")}`],
      missingFields,
    };
  }

  const records: TrainingRecord[] = result.data
    .map((row, i) => {
      try {
        const get = (f: keyof TrainingRecord) => (keyMap[f] ? row[keyMap[f]!] ?? "" : "");
        const dueDate = normalizeDate(get("dueDate"));
        if (!dueDate) return null;
        return {
          employeeName: get("employeeName").trim(),
          employeeId: get("employeeId").trim() || `R${i + 1}`,
          managerName: get("managerName").trim() || "Unassigned",
          department: get("department").trim() || "Unassigned",
          courseName: get("courseName").trim(),
          courseCategory: normalizeCategory(get("courseCategory")),
          trainingType: normalizeType(get("trainingType")),
          assignedDate: normalizeDate(get("assignedDate")) ?? dueDate,
          dueDate,
          completionDate: normalizeDate(get("completionDate")),
          status: normalizeStatus(get("status")),
        } as TrainingRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is TrainingRecord => r !== null);

  return { records, errors: [], missingFields };
}

export const SAMPLE_CSV = `Employee Name,Employee ID,Manager Name,Department,Course Name,Course Category,Training Type,Assigned Date,Due Date,Completion Date,Status
Alex Patel,E1001,Aarti Sharma,Engineering,Advanced TypeScript,Technical,Mandatory,2026-01-15,2026-03-15,2026-02-28,Completed
Sam Kim,E1002,Aarti Sharma,Engineering,Data Privacy & GDPR,Compliance,Mandatory,2026-01-10,2026-02-10,,Not Started
Priya Singh,E1003,Brian Cole,Engineering,Kubernetes Fundamentals,Technical,Optional,2026-02-01,2026-04-01,2026-03-20,Completed
Mei Garcia,E1004,Carla Nguyen,Product,Effective Communication,Non-Technical,Optional,2026-03-01,2026-04-30,,In Progress
Omar Khan,E1005,Daniel Owusu,Sales,Anti-Harassment Training,Compliance,Mandatory,2026-01-05,2026-02-05,,Not Started
`;
