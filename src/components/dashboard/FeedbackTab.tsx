import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MessageSquareHeart,
  Star,
  Upload,
  Download,
  RotateCcw,
  GraduationCap,
  Sparkles,
  Database,
  ThumbsUp,
  ThumbsDown,
  Minus,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseFeedbackCsv,
  SAMPLE_FEEDBACK_CSV,
} from "@/lib/feedback-csv-parser";
import {
  sentimentOf,
  type FeedbackRecord,
  type Sentiment,
} from "@/lib/feedback-types";
import { cn } from "@/lib/utils";
import { useDashboardSettings } from "@/lib/dashboard-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function buildTranscript(r: FeedbackRecord): string {
  const lines = [
    `Training Feedback Transcript`,
    `============================`,
    `Date:      ${r.trainingDate}`,
    `Course:    ${r.courseName}`,
    `Trainer:   ${r.trainerName}`,
    `Employee:  ${r.employeeName}`,
    `Manager:   ${r.managerName}`,
    `Rating:    ${r.rating} / 5`,
    ``,
    `Trainer: Thanks for attending "${r.courseName}". How was the session?`,
    `${r.employeeName}: ${r.comments || "(no additional comments provided)"}`,
    `Trainer: Appreciate the feedback — we'll factor it into the next cohort.`,
  ];
  return lines.join("\n");
}

const ratingColor = (avg: number) => {
  if (avg >= 4) return "var(--success)";
  if (avg >= 3) return "var(--warning)";
  return "var(--danger)";
};

function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= Math.round(value)
              ? "text-warning fill-warning"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

interface Props {
  data: FeedbackRecord[];
  isUsingMock: boolean;
  onLoad: (records: FeedbackRecord[]) => void;
  onReset: () => void;
}

export function FeedbackTab({ data, isUsingMock, onLoad, onReset }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(15);
  const { settings } = useDashboardSettings();
  const transcriptEnabled = settings.transcriptEnabled;
  const [viewing, setViewing] = useState<FeedbackRecord | null>(null);

  const downloadTranscript = (r: FeedbackRecord) => {
    const blob = new Blob([buildTranscript(r)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${r.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overall = useMemo(() => avg(data.map((d) => d.rating)), [data]);

  const byCourse = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of data) {
      const arr = m.get(r.courseName) ?? [];
      arr.push(r.rating);
      m.set(r.courseName, arr);
    }
    return Array.from(m.entries())
      .map(([course, ratings]) => ({
        course,
        avg: Number(avg(ratings).toFixed(2)),
        count: ratings.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);
  }, [data]);

  const byTrainer = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of data) {
      const arr = m.get(r.trainerName) ?? [];
      arr.push(r.rating);
      m.set(r.trainerName, arr);
    }
    return Array.from(m.entries())
      .map(([trainer, ratings]) => ({
        trainer,
        avg: Number(avg(ratings).toFixed(2)),
        count: ratings.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  const sentiment = useMemo(() => {
    const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
    for (const r of data) counts[sentimentOf(r.rating, r.comments)]++;
    const total = data.length || 1;
    return {
      counts,
      pct: {
        positive: Math.round((counts.positive / total) * 100),
        neutral: Math.round((counts.neutral / total) * 100),
        negative: Math.round((counts.negative / total) * 100),
      },
    };
  }, [data]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const r = parseFeedbackCsv(text);
    if (r.errors.length) return toast.error(r.errors.join(" "));
    if (!r.records.length) return toast.error("No valid feedback rows found.");
    onLoad(r.records);
    toast.success(`Loaded ${r.records.length} feedback entries`);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_FEEDBACK_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training-feedback-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Source + actions */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-sm flex items-center justify-between gap-4 flex-wrap px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "icon-3d h-9 w-9",
              isUsingMock ? "icon-3d-warning" : "icon-3d-success",
            )}
          >
            {isUsingMock ? (
              <Sparkles className="h-4 w-4 relative z-10" />
            ) : (
              <Database className="h-4 w-4 relative z-10" />
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Feedback source
            </span>
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              {isUsingMock ? "Sample feedback" : "Uploaded feedback"}
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="tabular-nums text-foreground">{data.length.toLocaleString()}</span>
                entries
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={downloadSample} className="h-9 text-muted-foreground hover:text-foreground">
            <Download className="h-4 w-4 mr-1.5" />
            Sample
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload feedback CSV
          </Button>
          {!isUsingMock && (
            <Button variant="outline" size="sm" onClick={onReset} className="h-9">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="flex items-start justify-between">
            <div className="icon-3d icon-3d-warning h-11 w-11">
              <Star className="h-5 w-5 relative z-10" />
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Overall Rating
          </div>
          <div className="text-[2rem] font-bold tabular-nums tracking-tight">
            {overall.toFixed(2)}
            <span className="text-base text-muted-foreground font-medium"> / 5</span>
          </div>
          <StarRow value={overall} />
        </Card>
        <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="icon-3d icon-3d-success h-11 w-11">
            <ThumbsUp className="h-5 w-5 relative z-10" />
          </div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Positive
          </div>
          <div className="text-[2rem] font-bold tabular-nums text-success">
            {sentiment.pct.positive}%
          </div>
          <div className="text-xs text-muted-foreground">{sentiment.counts.positive} responses</div>
        </Card>
        <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="icon-3d h-11 w-11">
            <Minus className="h-5 w-5 relative z-10" />
          </div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Neutral
          </div>
          <div className="text-[2rem] font-bold tabular-nums">{sentiment.pct.neutral}%</div>
          <div className="text-xs text-muted-foreground">{sentiment.counts.neutral} responses</div>
        </Card>
        <Card className="p-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="icon-3d icon-3d-danger h-11 w-11">
            <ThumbsDown className="h-5 w-5 relative z-10" />
          </div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Negative
          </div>
          <div className="text-[2rem] font-bold tabular-nums text-danger">
            {sentiment.pct.negative}%
          </div>
          <div className="text-xs text-muted-foreground">{sentiment.counts.negative} responses</div>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="flex items-start gap-3">
            <div className="icon-3d icon-3d-info h-10 w-10 shrink-0">
              <GraduationCap className="h-5 w-5 relative z-10" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight">Average Rating by Course</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Top 10 by avg rating</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCourse} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis dataKey="course" type="category" width={170} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _n, p) => [`${v} ★ (${p.payload.count} responses)`, "Avg"]}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {byCourse.map((r, i) => (
                    <Cell key={i} fill={ratingColor(r.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm bg-gradient-card">
          <div className="flex items-start gap-3">
            <div className="icon-3d icon-3d-brand h-10 w-10 shrink-0">
              <MessageSquareHeart className="h-5 w-5 relative z-10" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight">Trainer Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Average rating per trainer</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTrainer} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="trainer" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-25} textAnchor="end" interval={0} height={60} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _n, p) => [`${v} ★ (${p.payload.count} responses)`, "Avg"]}
                />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {byTrainer.map((r, i) => (
                    <Cell key={i} fill={ratingColor(r.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Raw feedback table */}
      <Card className="p-6 flex flex-col gap-5 border-border/70 shadow-sm bg-gradient-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="icon-3d h-10 w-10 shrink-0">
              <MessageSquareHeart className="h-5 w-5 relative z-10" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight">Raw Feedback</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Most recent feedback first</p>
            </div>
          </div>
          <Badge variant="secondary">{data.length} entries</Badge>
        </div>
        <div className="overflow-x-auto -mx-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data]
                .sort((a, b) => b.trainingDate.localeCompare(a.trainingDate))
                .slice(0, page)
                .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{r.trainingDate}</TableCell>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell>{r.courseName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.trainerName}</TableCell>
                    <TableCell>
                      <StarRow value={r.rating} />
                    </TableCell>
                    <TableCell className="max-w-[320px] text-sm text-muted-foreground">{r.comments}</TableCell>
                  </TableRow>
                ))}
              {!data.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No feedback for current view
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {page < data.length && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setPage(page + 15)}>
              Show more ({data.length - page} remaining)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
