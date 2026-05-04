import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { managerPerformance, lightClasses, trafficLight } from "@/lib/training-analytics";
import type { TrainingRecord } from "@/lib/training-types";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export function ManagerPerformance({ data }: { data: TrainingRecord[] }) {
  const rows = managerPerformance(data);
  return (
    <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm hover:shadow-elevated transition-shadow duration-300 bg-gradient-card">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-10 w-10 shrink-0">
          <Users className="h-5 w-5 relative z-10" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight">Manager Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sorted by lowest completion rate first — focus areas at the top
          </p>
        </div>
      </div>
      <div className="overflow-x-auto -mx-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">Team</TableHead>
              <TableHead>Completion %</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const lc = lightClasses(trafficLight(r.completionRate));
              return (
                <TableRow key={r.manager}>
                  <TableCell className="font-medium">{r.manager}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.teamSize}</TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="flex items-center gap-3">
                      <Progress value={r.completionRate} className="h-2" />
                      <span className="text-sm font-medium tabular-nums w-10 text-right">
                        {r.completionRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        r.overdueCount > 5 ? "text-danger" : r.overdueCount > 0 ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {r.overdueCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        lc.bg,
                        lc.text,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", lc.dot)} />
                      {lc.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                  No data for current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
