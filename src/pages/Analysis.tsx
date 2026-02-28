import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Brain, TrendingUp, Users, Award, BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

type SubjectGrade = { code: string; grade: string };
type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

const GRADE_ORDER = ["O", "A+", "A", "B+", "B", "C+", "C", "D", "F"];
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(198, 93%, 60%)",
  "hsl(350, 89%, 60%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(210, 70%, 50%)",
];

const PIE_COLORS = ["hsl(142, 76%, 36%)", "hsl(350, 89%, 60%)"];

const Analysis = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [meta, setMeta] = useState<{ program: string; semester: string; fetchedAt: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rgpv_results");
    const storedMeta = localStorage.getItem("rgpv_meta");
    if (stored) setResults(JSON.parse(stored));
    if (storedMeta) setMeta(JSON.parse(storedMeta));
  }, []);

  const validResults = useMemo(
    () => results.filter((r) => r.status !== "Error" && r.name !== "Fetch Failed" && r.sgpa !== "N/A"),
    [results]
  );

  // SGPA Distribution
  const sgpaDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      "0-4": 0, "4-5": 0, "5-6": 0, "6-7": 0, "7-8": 0, "8-9": 0, "9-10": 0,
    };
    validResults.forEach((r) => {
      const sgpa = parseFloat(r.sgpa);
      if (isNaN(sgpa)) return;
      if (sgpa < 4) buckets["0-4"]++;
      else if (sgpa < 5) buckets["4-5"]++;
      else if (sgpa < 6) buckets["5-6"]++;
      else if (sgpa < 7) buckets["6-7"]++;
      else if (sgpa < 8) buckets["7-8"]++;
      else if (sgpa < 9) buckets["8-9"]++;
      else buckets["9-10"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [validResults]);

  // Pass/Fail ratio
  const passFailData = useMemo(() => {
    let pass = 0, fail = 0;
    validResults.forEach((r) => {
      const s = r.status.toLowerCase();
      if (s.includes("pass")) pass++;
      else fail++;
    });
    return [
      { name: "Pass", value: pass },
      { name: "Fail", value: fail },
    ];
  }, [validResults]);

  // Subject-wise grade distribution
  const subjectGradeData = useMemo(() => {
    const subjectMap: Record<string, Record<string, number>> = {};
    validResults.forEach((r) => {
      r.subjects?.forEach((s) => {
        if (!subjectMap[s.code]) subjectMap[s.code] = {};
        subjectMap[s.code][s.grade] = (subjectMap[s.code][s.grade] || 0) + 1;
      });
    });
    return Object.entries(subjectMap).map(([code, grades]) => ({
      subject: code,
      ...grades,
    }));
  }, [validResults]);

  // All unique grades across subjects
  const allGrades = useMemo(() => {
    const grades = new Set<string>();
    subjectGradeData.forEach((s) => {
      Object.keys(s).filter((k) => k !== "subject").forEach((g) => grades.add(g));
    });
    return GRADE_ORDER.filter((g) => grades.has(g));
  }, [subjectGradeData]);

  // Stats
  const stats = useMemo(() => {
    if (validResults.length === 0) return null;
    const sgpas = validResults.map((r) => parseFloat(r.sgpa)).filter((n) => !isNaN(n));
    const avg = sgpas.reduce((a, b) => a + b, 0) / sgpas.length;
    const max = Math.max(...sgpas);
    const min = Math.min(...sgpas);
    const passCount = passFailData[0].value;
    const passPercent = ((passCount / validResults.length) * 100).toFixed(1);
    return { avg: avg.toFixed(2), max: max.toFixed(2), min: min.toFixed(2), total: validResults.length, passPercent };
  }, [validResults, passFailData]);

  // Top performers
  const topPerformers = useMemo(
    () =>
      [...validResults]
        .sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa))
        .slice(0, 5),
    [validResults]
  );

  // Export to Excel
  const exportToExcel = () => {
    const wsData = validResults.map((r, i) => {
      const row: Record<string, string | number> = {
        "#": i + 1,
        Enrollment: r.enrollment,
        Name: r.name,
        SGPA: r.sgpa,
        CGPA: r.cgpa,
        Status: r.status,
      };
      r.subjects?.forEach((s) => {
        row[s.code] = s.grade;
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);

    // Auto column widths
    const colWidths = Object.keys(wsData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...wsData.map((r) => String(r[key] || "").length)) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Results");

    // Stats sheet
    if (stats) {
      const statsData = [
        { Metric: "Total Students", Value: stats.total },
        { Metric: "Average SGPA", Value: stats.avg },
        { Metric: "Highest SGPA", Value: stats.max },
        { Metric: "Lowest SGPA", Value: stats.min },
        { Metric: "Pass Percentage", Value: `${stats.passPercent}%` },
        { Metric: "Program", Value: meta?.program || "N/A" },
        { Metric: "Semester", Value: meta?.semester || "N/A" },
        { Metric: "Fetched At", Value: meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleString() : "N/A" },
      ];
      const ws2 = XLSX.utils.json_to_sheet(statsData);
      ws2["!cols"] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");
    }

    XLSX.writeFile(wb, `RGPV_Results_${meta?.program || ""}_Sem${meta?.semester || ""}.xlsx`);
  };

  if (results.length === 0 || validResults.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Result Analysis & Prediction</h1>
            <p className="text-muted-foreground">Upload a CSV from the dashboard to see analytics here.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-12 card-glow text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Upload a CSV file with student enrollment numbers on the Dashboard. Results will be fetched from result.rgpv.com and analysis will appear here.
            </p>
            <Link to="/dashboard">
              <Button className="gap-2">Go to Dashboard</Button>
            </Link>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Result Analysis</h1>
            <p className="text-muted-foreground text-sm">
              {meta?.program} — Semester {meta?.semester} • {validResults.length} students
              {meta?.fetchedAt && ` • Fetched ${new Date(meta.fetchedAt).toLocaleDateString("en-IN")}`}
            </p>
          </div>
          <Button onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" /> Export to Excel
          </Button>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Students", value: stats.total, icon: Users, color: "text-primary" },
              { label: "Average SGPA", value: stats.avg, icon: TrendingUp, color: "text-primary" },
              { label: "Highest SGPA", value: stats.max, icon: Award, color: "text-green-500" },
              { label: "Lowest SGPA", value: stats.min, icon: Brain, color: "text-red-500" },
              { label: "Pass Rate", value: `${stats.passPercent}%`, icon: BarChart3, color: "text-primary" },
            ].map((s) => (
              <Card key={s.label} className="card-glow">
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold font-display">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Tabs */}
        <Tabs defaultValue="sgpa" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="sgpa">SGPA Distribution</TabsTrigger>
            <TabsTrigger value="passfail">Pass / Fail</TabsTrigger>
            <TabsTrigger value="subjects">Subject Grades</TabsTrigger>
          </TabsList>

          {/* SGPA Distribution */}
          <TabsContent value="sgpa">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg font-display">SGPA Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sgpaDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="range" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pass/Fail Pie */}
          <TabsContent value="passfail">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg font-display">Pass / Fail Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={passFailData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {passFailData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subject-wise Grades */}
          <TabsContent value="subjects">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg font-display">Subject-wise Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectGradeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        dataKey="subject"
                        type="category"
                        width={80}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend />
                      {allGrades.map((grade, i) => (
                        <Bar key={grade} dataKey={grade} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Performers */}
        <Card className="card-glow mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((r, i) => (
                <div key={r.enrollment} className="flex items-center justify-between bg-secondary/40 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary w-8">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.enrollment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono">SGPA: {r.sgpa}</Badge>
                    {r.cgpa !== "N/A" && <Badge variant="outline" className="font-mono">CGPA: {r.cgpa}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Analysis;
