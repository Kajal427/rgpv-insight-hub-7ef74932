import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalysisDashboard, type StudentResult } from "@/components/AnalysisDashboard";
import { logActivity } from "@/components/ActivityHistory";
import { Upload, FileSpreadsheet, ArrowLeft, Sparkles, FileUp, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

const UploadAnalysis = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState<{ program?: string; semester?: string } | null>(null);

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          toast({ title: "Empty File", description: "No data found in the uploaded file.", variant: "destructive" });
          return;
        }

        // Try to detect columns
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);

        const enrollKey = keys.find((k) => /enroll/i.test(k)) || keys.find((k) => k === "#") ? undefined : keys[0];
        const nameKey = keys.find((k) => /name/i.test(k));
        const sgpaKey = keys.find((k) => /sgpa/i.test(k));
        const cgpaKey = keys.find((k) => /cgpa/i.test(k));
        const statusKey = keys.find((k) => /status/i.test(k));

        const enrollColKey = keys.find((k) => /enroll/i.test(k)) || enrollKey;
        const subjectKeys = keys.filter((k) =>
          k !== "#" && k !== enrollColKey && k !== nameKey && k !== sgpaKey && k !== cgpaKey && k !== statusKey
        );

        const parsed: StudentResult[] = rows.map((row) => ({
          enrollment: String(row[enrollColKey || "Enrollment"] || "").trim(),
          name: String(row[nameKey || "Name"] || "Unknown").trim(),
          sgpa: String(row[sgpaKey || "SGPA"] || "0"),
          cgpa: String(row[cgpaKey || "CGPA"] || "N/A"),
          status: String(row[statusKey || "Status"] || "N/A"),
          subjects: subjectKeys
            .filter((k) => row[k])
            .map((k) => ({ code: k, grade: String(row[k]) })),
        })).filter((r) => r.enrollment && r.enrollment !== "undefined");

        // Try to get meta from Summary sheet
        const summarySheet = workbook.Sheets["Summary"];
        let parsedMeta: { program?: string; semester?: string } = {};
        if (summarySheet) {
          const summaryRows: Record<string, any>[] = XLSX.utils.sheet_to_json(summarySheet);
          summaryRows.forEach((r) => {
            if (r.Metric === "Program") parsedMeta.program = String(r.Value);
            if (r.Metric === "Semester") parsedMeta.semester = String(r.Value);
          });
        }

        setResults(parsed);
        setFileName(file.name);
        setMeta(Object.keys(parsedMeta).length > 0 ? parsedMeta : null);
        logActivity("excel_upload_analysis", { fileName: file.name, count: parsed.length });
        toast({ title: "File Loaded!", description: `Parsed ${parsed.length} student records from ${file.name}` });
      } catch (err: any) {
        toast({ title: "Parse Error", description: err.message || "Failed to parse the Excel file.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv"))) {
      parseExcel(file);
    } else {
      toast({ title: "Invalid File", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
    }
  }, [parseExcel, toast]);

  const clearResults = () => {
    setResults([]);
    setFileName(null);
    setMeta(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Upload & Analyze
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload a previously exported Excel sheet to generate a full performance analysis report.
            </p>
          </div>
          {results.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={clearResults}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {results.length === 0 ? (
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
              dragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="p-16 text-center">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <FileUp className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                Drop your Excel file here
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Upload an Excel (.xlsx, .xls) or CSV file with columns like Enrollment, Name, SGPA, CGPA, Status, and subject grades. 
                Previously exported sheets from this app work perfectly!
              </p>
              <div className="flex items-center justify-center gap-4">
                <label>
                  <Button className="gap-2 cursor-pointer" asChild>
                    <span>
                      <Upload className="h-4 w-4" /> Choose File
                    </span>
                  </Button>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { icon: FileSpreadsheet, label: "Excel & CSV support" },
                  { icon: Sparkles, label: "Auto-detect columns" },
                  { icon: Upload, label: "Drag & drop" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <f.icon className="h-3.5 w-3.5 text-primary" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-5 py-3">
              <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {results.length} students {meta?.program && `• ${meta.program}`} {meta?.semester && `• Semester ${meta.semester}`}
                </p>
              </div>
              <label>
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                  <span>
                    <Upload className="h-3.5 w-3.5" /> Replace
                  </span>
                </Button>
                <Input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Analysis Dashboard */}
            <AnalysisDashboard results={results} program={meta?.program} semester={meta?.semester} />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default UploadAnalysis;
