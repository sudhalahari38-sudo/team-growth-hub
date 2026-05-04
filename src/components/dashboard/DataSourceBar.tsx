import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, RotateCcw, Download } from "lucide-react";
import { parseTrainingCsv, SAMPLE_CSV } from "@/lib/csv-parser";
import type { TrainingRecord } from "@/lib/training-types";
import { toast } from "sonner";

interface DataSourceBarProps {
  isUsingMock: boolean;
  recordCount: number;
  onLoad: (records: TrainingRecord[]) => void;
  onReset: () => void;
}

export function DataSourceBar({ isUsingMock, recordCount, onLoad, onReset }: DataSourceBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseTrainingCsv(text);
    if (result.errors.length) {
      toast.error(result.errors.join(" "));
      return;
    }
    if (!result.records.length) {
      toast.error("No valid rows found in the CSV.");
      return;
    }
    onLoad(result.records);
    toast.success(`Loaded ${result.records.length} training records from CSV`);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "percipio-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isUsingMock ? "bg-warning" : "bg-success"}`}
        />
        <span className="text-muted-foreground">
          {isUsingMock ? "Showing sample data" : "Showing your uploaded data"} •{" "}
          <span className="font-medium text-foreground tabular-nums">{recordCount}</span> records
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={downloadSample}>
          <Download className="h-4 w-4 mr-1.5" />
          Sample CSV
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
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1.5" />
          Upload Percipio CSV
        </Button>
        {!isUsingMock && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
