import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { atRiskEmployees } from "@/lib/training-analytics";
import type { TrainingRecord } from "@/lib/training-types";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE = 10;

export function AtRiskTable({ data }: { data: TrainingRecord[] }) {
  const rows = atRiskEmployees(data);
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.slice(0, limit);

  return (
    <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="icon-3d icon-3d-danger h-10 w-10 shrink-0 shadow-glow-brand">
            <AlertTriangle className="h-5 w-5 relative z-10" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground tracking-tight">
              Overdue / At-Risk Employees
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sorted by highest risk (most days overdue) first — needs immediate action
            </p>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs shadow-sm">
          {rows.length} overdue
        </Badge>
      </div>
      <div className="overflow-x-auto -mx-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r, i) => {
              const severe = r.daysOverdue >= 30;
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <div>{r.employeeName}</div>
                    <div className="text-[11px] text-muted-foreground">{r.employeeId}</div>
                  </TableCell>
                  <TableCell>
                    <div>{r.courseName}</div>
                    <div className="text-[11px] text-muted-foreground">{r.category}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.managerName}</TableCell>
                  <TableCell>
                    {r.trainingType === "Mandatory" ? (
                      <Badge variant="destructive" className="text-[10px]">Mandatory</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{r.dueDate}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-semibold",
                      severe ? "text-danger" : "text-warning",
                    )}
                  >
                    {r.daysOverdue}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{r.status}</span>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                  No overdue trainings — everyone is on track 🎉
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {limit < rows.length && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setLimit(limit + PAGE)}>
            Show more ({rows.length - limit} remaining)
          </Button>
        </div>
      )}
    </Card>
  );
}
