import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EMPTY_FILTERS, type Filters } from "@/lib/training-types";
import {
  X,
  Upload,
  Download,
  RotateCcw,
  UserCircle2,
  Building2,
  Layers,
  Tag,
  Activity,
  SlidersHorizontal,
  Database,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { parseTrainingCsv, SAMPLE_CSV } from "@/lib/csv-parser";
import type { TrainingRecord } from "@/lib/training-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  options: {
    managers: string[];
    departments: string[];
    categories: string[];
    trainingTypes: string[];
    statuses: string[];
  };
  isUsingMock: boolean;
  recordCount: number;
  onLoad: (records: TrainingRecord[]) => void;
  onReset: () => void;
  onSync?: () => void;
  syncing?: boolean;
}

function FilterField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const active = value !== "all";
  return (
    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "h-10 bg-background border-border/70 text-sm font-medium pl-9 relative transition-all",
            "hover:border-primary/40 hover:shadow-sm",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary/60",
            active && "border-primary/50 bg-primary/[0.03] text-foreground",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              active ? "text-primary" : "text-muted-foreground/70",
            )}
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ControlPanel({
  filters,
  setFilters,
  options,
  isUsingMock,
  recordCount,
  onLoad,
  onReset,
  onSync,
  syncing,
}: ControlPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFiltered = Object.values(filters).some((v) => v !== "all");
  const activeCount = Object.values(filters).filter((v) => v !== "all").length;

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseTrainingCsv(text);
    if (result.errors.length) return toast.error(result.errors.join(" "));
    if (!result.records.length) return toast.error("No valid rows found in the CSV.");
    onLoad(result.records);
    toast.success(`Loaded ${result.records.length} training records from CSV`);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lms-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterChips: { key: keyof Filters; label: string }[] = [
    { key: "manager", label: "Manager" },
    { key: "department", label: "Dept" },
    { key: "category", label: "Category" },
    { key: "trainingType", label: "Type" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="relative rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
      {/* subtle top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Top row: data source + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-3.5 border-b border-border/60 bg-gradient-to-b from-secondary/40 to-transparent">
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
              Data source
            </span>
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              {isUsingMock ? "Sample dataset" : "Uploaded CSV"}
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="tabular-nums text-foreground">{recordCount.toLocaleString()}</span>
                records
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadSample}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
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
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-glow-primary transition-shadow"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload LMS CSV
          </Button>
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncing}
              className="h-9"
              title="Sync the latest learning-activity report from LMS"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync LMS API"}
            </Button>
          )}
          {!isUsingMock && (
            <Button variant="outline" size="sm" onClick={onReset} className="h-9">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="hidden md:flex flex-col items-center gap-1 pt-6 pr-2 border-r border-border/60 mr-1">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground writing-mode-vertical">
              Filters
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterField
              label="Manager"
              icon={UserCircle2}
              value={filters.manager}
              onChange={(v) => setFilters({ ...filters, manager: v })}
              options={options.managers}
            />
            <FilterField
              label="Department"
              icon={Building2}
              value={filters.department}
              onChange={(v) => setFilters({ ...filters, department: v })}
              options={options.departments}
            />
            <FilterField
              label="Category"
              icon={Layers}
              value={filters.category}
              onChange={(v) => setFilters({ ...filters, category: v })}
              options={options.categories}
            />
            <FilterField
              label="Type"
              icon={Tag}
              value={filters.trainingType}
              onChange={(v) => setFilters({ ...filters, trainingType: v })}
              options={options.trainingTypes}
            />
            <FilterField
              label="Status"
              icon={Activity}
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
              options={options.statuses}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {isFiltered && (
          <div className="mt-4 pt-4 border-t border-dashed border-border/70 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {activeCount} active
            </span>
            {filterChips.map((c) =>
              filters[c.key] !== "all" ? (
                <button
                  key={c.key}
                  onClick={() => setFilters({ ...filters, [c.key]: "all" })}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary px-2.5 py-1 text-[11px] font-medium transition-colors"
                >
                  <span className="text-primary/60">{c.label}:</span>
                  <span className="font-semibold">{filters[c.key]}</span>
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ) : null,
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-7 ml-auto text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear all
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
