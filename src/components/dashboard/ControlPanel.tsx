import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EMPTY_FILTERS, type Filters } from "@/lib/training-types";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
    courseNames: string[];
  };
  hideManagerFilter?: boolean;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const active = value !== "all";
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "h-9 bg-background text-sm font-medium transition-colors",
            active && "border-primary/50 bg-primary/[0.03] text-foreground",
          )}
        >
          <SelectValue placeholder={placeholder ?? `All ${label.toLowerCase()}`} />
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
  hideManagerFilter,
}: ControlPanelProps) {
  const searchValue = filters.courseName === "all" ? "" : filters.courseName;

  const activeChips: { key: keyof Filters; label: string; value: string }[] = [];
  if (searchValue) activeChips.push({ key: "courseName", label: "Search", value: searchValue });
  if (filters.status !== "all")
    activeChips.push({ key: "status", label: "Status", value: filters.status });
  if (filters.department !== "all")
    activeChips.push({ key: "department", label: "Department", value: filters.department });
  if (filters.category !== "all")
    activeChips.push({ key: "category", label: "Category", value: filters.category });
  if (filters.trainingType !== "all")
    activeChips.push({ key: "trainingType", label: "Type", value: filters.trainingType });
  if (!hideManagerFilter && filters.manager !== "all")
    activeChips.push({ key: "manager", label: "Manager", value: filters.manager });

  const clearChip = (key: keyof Filters) =>
    setFilters({ ...filters, [key]: "all" });

  const moreActiveCount =
    (filters.trainingType !== "all" ? 1 : 0) +
    (!hideManagerFilter && filters.manager !== "all" ? 1 : 0);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:flex-wrap">
        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
            Search training
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              value={searchValue}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  courseName: e.target.value ? e.target.value : "all",
                })
              }
              placeholder="Search training name…"
              className="h-9 pl-9"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, courseName: "all" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <SelectField
          label="Status"
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={options.statuses}
        />
        <SelectField
          label="Department"
          value={filters.department}
          onChange={(v) => setFilters({ ...filters, department: v })}
          options={options.departments}
        />
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(v) => setFilters({ ...filters, category: v })}
          options={options.categories}
        />

        {/* More filters */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-transparent select-none">
            _
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  moreActiveCount > 0 && "border-primary/50 text-primary",
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                More filters
                {moreActiveCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {moreActiveCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 space-y-3">
              <SelectField
                label="Type"
                value={filters.trainingType}
                onChange={(v) => setFilters({ ...filters, trainingType: v })}
                options={options.trainingTypes}
              />
              {!hideManagerFilter && (
                <SelectField
                  label="Manager"
                  value={filters.manager}
                  onChange={(v) => setFilters({ ...filters, manager: v })}
                  options={options.managers}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-t border-border/60 bg-muted/30">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {activeChips.length} active
          </span>
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => clearChip(c.key)}
              className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary px-2.5 py-1 text-[11px] font-medium transition-colors"
            >
              <span className="text-primary/60">{c.label}:</span>
              <span className="font-semibold">{c.value}</span>
              <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
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
  );
}
