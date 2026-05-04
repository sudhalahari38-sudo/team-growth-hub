import type { TrainingRecord, CourseCategory, TrainingType, TrainingStatus } from "./training-types";

const managers = [
  { name: "Aarti Sharma", dept: "Engineering" },
  { name: "Brian Cole", dept: "Engineering" },
  { name: "Carla Nguyen", dept: "Product" },
  { name: "Daniel Owusu", dept: "Sales" },
  { name: "Elena Rossi", dept: "Sales" },
  { name: "Faisal Ahmed", dept: "Customer Success" },
  { name: "Grace Park", dept: "Marketing" },
  { name: "Hiro Tanaka", dept: "Finance" },
  { name: "Isla Murphy", dept: "People Ops" },
  { name: "Jamal Reed", dept: "IT" },
];

const employeeFirstNames = ["Alex","Sam","Priya","Mei","Omar","Liam","Zoe","Noah","Ava","Ethan","Maya","Kai","Leo","Nia","Ravi","Sara","Tariq","Uma","Vera","Wes","Yara","Zane","Cole","Dina","Erin","Finn","Gia","Hank","Iris","Jude"];
const employeeLastNames = ["Patel","Kim","Garcia","Smith","Lee","Khan","Brown","Wilson","Singh","Davis","Lopez","Cohen","Nguyen","Müller","Silva","Adeyemi","Rossi","Cohn","Park","Walsh"];

const coursesByCategory: Record<CourseCategory, string[]> = {
  Technical: ["Advanced TypeScript", "Kubernetes Fundamentals", "AWS Solutions Architect", "SQL Performance Tuning", "React Patterns", "Python for Data", "API Security", "Docker Deep Dive"],
  "Non-Technical": ["Effective Communication", "Time Management", "Negotiation Basics", "Presentation Skills", "Business Writing"],
  Compliance: ["Anti-Harassment Training", "Data Privacy & GDPR", "Information Security Awareness", "Code of Conduct", "Anti-Bribery & Corruption"],
  Coaching: ["Coaching for Managers", "Giving Feedback", "1:1 Mastery", "Performance Conversations"],
};

// Deterministic PRNG so dataset is stable across reloads
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function generateMockTrainingData(): TrainingRecord[] {
  const rng = mulberry32(42);
  const today = new Date("2026-05-04");
  const records: TrainingRecord[] = [];

  // Build employees: ~6-10 per manager
  const employees: { id: string; name: string; manager: string; dept: string }[] = [];
  let idCounter = 1000;
  for (const m of managers) {
    const teamSize = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < teamSize; i++) {
      idCounter++;
      employees.push({
        id: `E${idCounter}`,
        name: `${pick(rng, employeeFirstNames)} ${pick(rng, employeeLastNames)}`,
        manager: m.name,
        dept: m.dept,
      });
    }
  }

  const categories: CourseCategory[] = ["Technical", "Non-Technical", "Compliance", "Coaching"];

  for (const emp of employees) {
    const numCourses = 4 + Math.floor(rng() * 5); // 4-8 courses each
    for (let i = 0; i < numCourses; i++) {
      const category = pick(rng, categories);
      const courseName = pick(rng, coursesByCategory[category]);
      const trainingType: TrainingType =
        category === "Compliance" ? "Mandatory" : rng() < 0.55 ? "Mandatory" : "Optional";

      const assignedDaysAgo = Math.floor(rng() * 180) + 10; // 10-190 days ago
      const assigned = addDays(today, -assignedDaysAgo);
      const dueOffset = 30 + Math.floor(rng() * 60); // due 30-90 days after assigned
      const due = addDays(assigned, dueOffset);

      // Status logic with realistic distribution
      const r = rng();
      let status: TrainingStatus;
      let completionDate: string | null = null;

      if (r < 0.55) {
        status = "Completed";
        // completed somewhere between assigned and min(today, due+10)
        const maxComp = Math.min(today.getTime(), due.getTime() + 10 * 86400000);
        const compTime = assigned.getTime() + rng() * (maxComp - assigned.getTime());
        completionDate = isoDate(new Date(compTime));
      } else if (r < 0.8) {
        status = "In Progress";
      } else {
        status = "Not Started";
      }

      records.push({
        employeeName: emp.name,
        employeeId: emp.id,
        managerName: emp.manager,
        department: emp.dept,
        courseName,
        courseCategory: category,
        trainingType,
        assignedDate: isoDate(assigned),
        dueDate: isoDate(due),
        completionDate,
        status,
      });
    }
  }

  return records;
}
