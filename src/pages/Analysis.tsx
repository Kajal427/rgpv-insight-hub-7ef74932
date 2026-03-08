import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnalysisDashboard, type StudentResult } from "@/components/AnalysisDashboard";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

const Analysis = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [meta, setMeta] = useState<{ program: string; semester: string; fetchedAt: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rgpv_results");
    const storedMeta = localStorage.getItem("rgpv_meta");
    if (stored) setResults(JSON.parse(stored));
    if (storedMeta) setMeta(JSON.parse(storedMeta));
  }, []);

  const validResults = results.filter((r) => r.status !== "Error" && r.name !== "Fetch Failed" && r.sgpa !== "N/A");

  const exportToExcel = () => {
    const wsData = validResults.map((r, i) => {
      const row: Record<string, string | number> = {
        "#": i + 1, Enrollment: r.enrollment, Name: r.name, SGPA: r.sgpa, CGPA: r.cgpa, Status: r.status,
      };
      r.subjects?.forEach((s) => { row[s.code] = s.grade; });
      return row;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws["!cols"] = Object.keys(wsData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...wsData.map((r) => String(r[key] || "").length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    if (meta) {
      const sgpas = validResults.map((r) => parseFloat(r.sgpa)).filter((n) => !isNaN(n));
      const passCount = validResults.filter((r) => r.status.toLowerCase().includes("pass")).length;
      const statsData = [
        { Metric: "Total Students", Value: validResults.length },
        { Metric: "Average SGPA", Value: (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2) },
        { Metric: "Highest SGPA", Value: Math.max(...sgpas).toFixed(2) },
        { Metric: "Lowest SGPA", Value: Math.min(...sgpas).toFixed(2) },
        { Metric: "Pass Percentage", Value: `${((passCount / validResults.length) * 100).toFixed(1)}%` },
        { Metric: "Program", Value: meta.program },
        { Metric: "Semester", Value: meta.semester },
        { Metric: "Fetched At", Value: new Date(meta.fetchedAt).toLocaleString() },
      ];
      const ws2 = XLSX.utils.json_to_sheet(statsData);
      ws2["!cols"] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");
    }
    XLSX.writeFile(wb, `RGPV_Results_${meta?.program || ""}_Sem${meta?.semester || ""}.xlsx`);
  };

  if (validResults.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Result Analysis</h1>
            <p className="text-muted-foreground">Fetch results from the dashboard or upload an Excel file to see analytics.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-12 card-glow text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Upload a CSV on the Dashboard to fetch results, or upload a previously exported Excel file for analysis.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/dashboard"><Button className="gap-2">Go to Dashboard</Button></Link>
              <Link to="/upload-analysis"><Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Upload Excel</Button></Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Result Analysis</h1>
            <p className="text-muted-foreground text-sm">
              {meta?.program} — Semester {meta?.semester} • {validResults.length} students
              {meta?.fetchedAt && ` • Fetched ${new Date(meta.fetchedAt).toLocaleDateString("en-IN")}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/upload-analysis">
              <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Upload Excel</Button>
            </Link>
            <Button onClick={exportToExcel} className="gap-2">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>

        <AnalysisDashboard results={results} program={meta?.program} semester={meta?.semester} />
      </div>
      <Footer />
    </div>
  );
};

export default Analysis;
