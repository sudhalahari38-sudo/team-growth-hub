import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TrainingRecord } from "./training-types";
import type { Identity } from "./current-user";

/**
 * Permission gate for manager-scoped transcript exports.
 * Leadership can export any team; managers can only export their own team.
 */
export function canExportTeamTranscript(
  identity: Identity,
  managerName: string,
): boolean {
  if (identity.role === "leadership") return true;
  return identity.managerName === managerName;
}

function teamRows(data: TrainingRecord[], managerName: string) {
  return data
    .filter((r) => r.managerName === managerName)
    .sort(
      (a, b) =>
        a.employeeName.localeCompare(b.employeeName) ||
        a.dueDate.localeCompare(b.dueDate),
    );
}

const HEADERS = [
  "Employee",
  "Employee ID",
  "Department",
  "Course",
  "Category",
  "Type",
  "Status",
  "Assigned",
  "Due",
  "Completed",
];

function toRow(r: TrainingRecord): (string | number)[] {
  return [
    r.employeeName,
    r.employeeId,
    r.department,
    r.courseName,
    r.courseCategory,
    r.trainingType,
    r.status,
    r.assignedDate,
    r.dueDate,
    r.completionDate ?? "—",
  ];
}

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function exportTeamTranscriptCsv(
  data: TrainingRecord[],
  managerName: string,
) {
  const rows = teamRows(data, managerName);
  const lines = [
    `Training Transcript — ${managerName}`,
    `Generated,${new Date().toISOString()}`,
    `Records,${rows.length}`,
    "",
    HEADERS.join(","),
    ...rows.map((r) => toRow(r).map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `transcript-${slugify(managerName)}.csv`);
  return rows.length;
}

export function exportTeamTranscriptPdf(
  data: TrainingRecord[],
  managerName: string,
) {
  const rows = teamRows(data, managerName);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Training Transcript", 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Manager: ${managerName}`, 40, 60);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 74);
  doc.text(`Records: ${rows.length}`, 40, 88);

  autoTable(doc, {
    head: [HEADERS],
    body: rows.map(toRow),
    startY: 104,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`transcript-${slugify(managerName)}.pdf`);
  return rows.length;
}
