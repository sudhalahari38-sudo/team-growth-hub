import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EMPTY_FILTERS, type Filters } from "@/lib/training-types";
import { X } from "lucide-react";

interface FilterBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  options: {
    managers: string[];
    departments: string[];
    categories: string[];
    trainingTypes: string[];
    statuses: string[];
  };
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px] flex-1">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card">
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

export function FilterBar({ filters, setFilters, options }: FilterBarProps) {
  const isFiltered = Object.values(filters).some((v) => v !== "all");
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Manager"
        value={filters.manager}
        onChange={(v) => setFilters({ ...filters, manager: v })}
        options={options.managers}
      />
      <FilterSelect
        label="Department"
        value={filters.department}
        onChange={(v) => setFilters({ ...filters, department: v })}
        options={options.departments}
      />
      <FilterSelect
        label="Category"
        value={filters.category}
        onChange={(v) => setFilters({ ...filters, category: v })}
        options={options.categories}
      />
      <FilterSelect
        label="Type"
        value={filters.trainingType}
        onChange={(v) => setFilters({ ...filters, trainingType: v })}
        options={options.trainingTypes}
      />
      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(v) => setFilters({ ...filters, status: v })}
        options={options.statuses}
      />
      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)} className="h-9">
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
