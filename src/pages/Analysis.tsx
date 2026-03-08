import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnalysisDashboard, type StudentResult } from "@/components/AnalysisDashboard";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Upload, FileText, ImageDown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

const GRADE_POINTS: Record<string, number> = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C+": 5, "C": 4, "D": 3, "F": 0 };

const Analysis = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [meta, setMeta] = useState<{ program: string; semester: string; fetchedAt: string } | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("rgpv_results");
    const storedMeta = localStorage.getItem("rgpv_meta");
    if (stored) setResults(JSON.parse(stored));
    if (storedMeta) setMeta(JSON.parse(storedMeta));
  }, []);

  const validResults = results.filter((r) => r.status !== "Error" && r.name !== "Fetch Failed" && r.name !== "Not Found" && r.sgpa !== "N/A");

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

  const exportAnalysisReport = () => {
    if (validResults.length === 0) return;
    const wb = XLSX.utils.book_new();

    const sgpas = validResults.map((r) => parseFloat(r.sgpa)).filter((n) => !isNaN(n));
    const cgpas = validResults.map((r) => parseFloat(r.cgpa)).filter((n) => !isNaN(n));
    const passCount = validResults.filter((r) => r.status.toLowerCase().includes("pass")).length;
    const failCount = validResults.length - passCount;
    const sortedSgpas = [...sgpas].sort((a, b) => a - b);
    const median = sortedSgpas[Math.floor(sortedSgpas.length / 2)];

    const overviewData = [
      { Metric: "Program", Value: meta?.program || "N/A" },
      { Metric: "Semester", Value: meta?.semester || "N/A" },
      { Metric: "Report Generated", Value: new Date().toLocaleString("en-IN") },
      { Metric: "Data Fetched At", Value: meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleString("en-IN") : "N/A" },
      { Metric: "", Value: "" },
      { Metric: "Total Students", Value: validResults.length },
      { Metric: "Pass Count", Value: passCount },
      { Metric: "Fail Count", Value: failCount },
      { Metric: "Pass Percentage", Value: `${((passCount / validResults.length) * 100).toFixed(1)}%` },
      { Metric: "", Value: "" },
      { Metric: "Average SGPA", Value: (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2) },
      { Metric: "Highest SGPA", Value: Math.max(...sgpas).toFixed(2) },
      { Metric: "Lowest SGPA", Value: Math.min(...sgpas).toFixed(2) },
      { Metric: "Median SGPA", Value: median?.toFixed(2) || "N/A" },
      ...(cgpas.length > 0 ? [
        { Metric: "", Value: "" },
        { Metric: "Average CGPA", Value: (cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) },
        { Metric: "Highest CGPA", Value: Math.max(...cgpas).toFixed(2) },
        { Metric: "Lowest CGPA", Value: Math.min(...cgpas).toFixed(2) },
      ] : []),
    ];
    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    wsOverview["!cols"] = [{ wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    const sgpaBuckets: Record<string, number> = { "0-4": 0, "4-5": 0, "5-6": 0, "6-7": 0, "7-8": 0, "8-9": 0, "9-10": 0 };
    sgpas.forEach((s) => {
      if (s < 4) sgpaBuckets["0-4"]++;
      else if (s < 5) sgpaBuckets["4-5"]++;
      else if (s < 6) sgpaBuckets["5-6"]++;
      else if (s < 7) sgpaBuckets["6-7"]++;
      else if (s < 8) sgpaBuckets["7-8"]++;
      else if (s < 9) sgpaBuckets["8-9"]++;
      else sgpaBuckets["9-10"]++;
    });
    const distData = Object.entries(sgpaBuckets).map(([range, count]) => ({
      "SGPA Range": range, "Student Count": count, "Percentage": `${((count / sgpas.length) * 100).toFixed(1)}%`,
    }));
    const wsDist = XLSX.utils.json_to_sheet(distData);
    wsDist["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsDist, "SGPA Distribution");

    const subjectMap: Record<string, { grades: Record<string, number>; total: number; points: number }> = {};
    validResults.forEach((r) => {
      r.subjects?.forEach((s) => {
        if (!subjectMap[s.code]) subjectMap[s.code] = { grades: {}, total: 0, points: 0 };
        subjectMap[s.code].grades[s.grade] = (subjectMap[s.code].grades[s.grade] || 0) + 1;
        subjectMap[s.code].total++;
        subjectMap[s.code].points += GRADE_POINTS[s.grade] || 0;
      });
    });
    const subjectData = Object.entries(subjectMap).map(([code, data]) => ({
      "Subject Code": code, "Students": data.total, "Avg Grade Points": (data.points / data.total).toFixed(2), ...data.grades,
    }));
    if (subjectData.length > 0) {
      const wsSub = XLSX.utils.json_to_sheet(subjectData);
      wsSub["!cols"] = Object.keys(subjectData[0]).map((k) => ({ wch: Math.max(k.length + 2, 14) }));
      XLSX.utils.book_append_sheet(wb, wsSub, "Subject Analysis");
    }

    const topPerformers = [...validResults].sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa)).slice(0, 20);
    const topData = topPerformers.map((r, i) => ({
      Rank: i + 1, Enrollment: r.enrollment, Name: r.name, SGPA: r.sgpa, CGPA: r.cgpa, Status: r.status,
    }));
    const wsTop = XLSX.utils.json_to_sheet(topData);
    wsTop["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsTop, "Top Performers");

    const fullData = validResults.map((r, i) => {
      const row: Record<string, string | number> = {
        "#": i + 1, Enrollment: r.enrollment, Name: r.name, SGPA: r.sgpa, CGPA: r.cgpa, Status: r.status,
      };
      r.subjects?.forEach((s) => { row[s.code] = s.grade; });
      return row;
    });
    const wsFull = XLSX.utils.json_to_sheet(fullData);
    wsFull["!cols"] = Object.keys(fullData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...fullData.map((r) => String(r[key] || "").length)) + 2,
    }));
    XLSX.utils.book_append_sheet(wb, wsFull, "All Results");

    XLSX.writeFile(wb, `RGPV_Analysis_Report_${meta?.program || ""}_Sem${meta?.semester || ""}.xlsx`);
  };

  const exportPdfWithCharts = async () => {
    if (!chartsRef.current) return;
    setExportingPdf(true);
    toast({ title: "Generating PDF...", description: "Capturing all charts, please wait." });

    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Title page
      pdf.setFontSize(24);
      pdf.setTextColor(30, 41, 59);
      pdf.text("RGPV Result Analysis Report", pageW / 2, 40, { align: "center" });
      pdf.setFontSize(14);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `${meta?.program || "N/A"} — Semester ${meta?.semester || "N/A"} • ${validResults.length} Students`,
        pageW / 2, 52, { align: "center" }
      );
      pdf.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageW / 2, 60, { align: "center" });

      // Capture each section with data-chart-card attribute
      const cards = chartsRef.current.querySelectorAll<HTMLElement>("[data-chart-card]");

      if (cards.length === 0) {
        // Fallback: capture the entire dashboard
        const canvas = await html2canvas(chartsRef.current, {
          scale: 2, backgroundColor: "#0d1117", useCORS: true, logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height / canvas.width) * imgW;
        pdf.addPage();
        const finalH = Math.min(imgH, pageH - margin * 2);
        const finalW = imgH > pageH - margin * 2 ? (canvas.width / canvas.height) * finalH : imgW;
        pdf.addImage(imgData, "PNG", (pageW - finalW) / 2, margin, finalW, finalH, undefined, "FAST");
      } else {
        for (let i = 0; i < cards.length; i++) {
          const canvas = await html2canvas(cards[i], {
            scale: 2, backgroundColor: "#0d1117", useCORS: true, logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const imgW = pageW - margin * 2;
          const imgH = (canvas.height / canvas.width) * imgW;
          pdf.addPage();
          const finalH = Math.min(imgH, pageH - margin * 2);
          const finalW = imgH > pageH - margin * 2 ? (canvas.width / canvas.height) * finalH : imgW;
          pdf.addImage(imgData, "PNG", (pageW - finalW) / 2, margin, finalW, finalH, undefined, "FAST");
        }
      }

      pdf.save(`RGPV_Analysis_Charts_${meta?.program || ""}_Sem${meta?.semester || ""}.pdf`);
      toast({ title: "PDF Downloaded!", description: "Report with all charts saved successfully." });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
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
          <div className="flex gap-2 flex-wrap">
            <Link to="/upload-analysis">
              <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Upload Excel</Button>
            </Link>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <Download className="h-4 w-4" /> Export Data
            </Button>
            <Button variant="outline" onClick={exportAnalysisReport} className="gap-2">
              <FileText className="h-4 w-4" /> Download Report
            </Button>
            <Button onClick={exportPdfWithCharts} disabled={exportingPdf} className="gap-2">
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
              {exportingPdf ? "Generating..." : "Download with Charts"}
            </Button>
          </div>
        </div>

        <div ref={chartsRef}>
          <AnalysisDashboard results={results} program={meta?.program} semester={meta?.semester} />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Analysis;
