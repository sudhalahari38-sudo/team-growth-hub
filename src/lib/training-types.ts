export type TrainingStatus = "Completed" | "In Progress" | "Not Started";
export type CourseCategory = "Technical" | "Non-Technical" | "Compliance" | "Coaching" | "CDP";
export type TrainingType = "Mandatory" | "Optional";

export interface TrainingRecord {
  employeeName: string;
  employeeId: string;
  managerName: string;
  department: string;
  courseName: string;
  courseCategory: CourseCategory;
  trainingType: TrainingType;
  assignedDate: string; // ISO yyyy-mm-dd
  dueDate: string;
  completionDate: string | null;
  status: TrainingStatus;
}

export interface Filters {
  manager: string;
  department: string;
  category: string;
  trainingType: string;
  status: string;
  courseName: string;
}

export const EMPTY_FILTERS: Filters = {
  manager: "all",
  department: "all",
  category: "all",
  trainingType: "all",
  status: "all",
  courseName: "all",
};
