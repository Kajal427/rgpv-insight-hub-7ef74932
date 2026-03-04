import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Brain, TrendingUp, Users, Award, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  "hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)", "hsl(198, 93%, 60%)", "hsl(350, 89%, 60%)",
  "hsl(160, 60%, 45%)", "hsl(30, 80%, 55%)", "hsl(210, 70%, 50%)",
];
const PIE_COLORS = ["hsl(142, 76%, 36%)", "hsl(350, 89%, 60%)"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  color: "hsl(var(--foreground))",
};

interface AnalysisSectionProps {
  results: StudentResult[];
  program: string;
  semester: string;
}

export function AnalysisSection({ results, program, semester }: AnalysisSectionProps) {
  const validResults = useMemo(
    () => results.filter((r) => r.status !== "Error" && r.name !== "Fetch Failed" && r.name !== "Skipped" && r.sgpa !== "N/A"),
    [results]
  );

  const sgpaDistribution = useMemo(() => {
    const buckets: Record<string, number> = { "0-4": 0, "4-5": 0, "5-6": 0, "6-7": 0, "7-8": 0, "8-9": 0, "9-10": 0 };
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

  const passFailData = useMemo(() => {
    let pass = 0, fail = 0;
    validResults.forEach((r) => {
      r.status.toLowerCase().includes("pass") ? pass++ : fail++;
    });
    return [{ name: "Pass", value: pass }, { name: "Fail", value: fail }];
  }, [validResults]);

  const subjectGradeData = useMemo(() => {
    const subjectMap: Record<string, Record<string, number>> = {};
    validResults.forEach((r) => {
      r.subjects?.forEach((s) => {
        if (!subjectMap[s.code]) subjectMap[s.code] = {};
        subjectMap[s.code][s.grade] = (subjectMap[s.code][s.grade] || 0) + 1;
      });
    });
    return Object.entries(subjectMap).map(([code, grades]) => ({ subject: code, ...grades }));
  }, [validResults]);

  const allGrades = useMemo(() => {
    const grades = new Set<string>();
    subjectGradeData.forEach((s) => Object.keys(s).filter((k) => k !== "subject").forEach((g) => grades.add(g)));
    return GRADE_ORDER.filter((g) => grades.has(g));
  }, [subjectGradeData]);

  const stats = useMemo(() => {
    if (validResults.length === 0) return null;
    const sgpas = validResults.map((r) => parseFloat(r.sgpa)).filter((n) => !isNaN(n));
    const avg = sgpas.reduce((a, b) => a + b, 0) / sgpas.length;
    const passCount = passFailData[0].value;
    return {
      avg: avg.toFixed(2), max: Math.max(...sgpas).toFixed(2), min: Math.min(...sgpas).toFixed(2),
      total: validResults.length, passPercent: ((passCount / validResults.length) * 100).toFixed(1),
    };
  }, [validResults, passFailData]);

  const topPerformers = useMemo(
    () => [...validResults].sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa)).slice(0, 5),
    [validResults]
  );

  if (validResults.length === 0) return null;

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" /> Result Analysis
      </h2>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

      {/* Charts */}
      <Tabs defaultValue="sgpa">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="sgpa">SGPA Distribution</TabsTrigger>
          <TabsTrigger value="passfail">Pass / Fail</TabsTrigger>
          <TabsTrigger value="subjects">Subject Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="sgpa">
          <Card className="card-glow">
            <CardHeader><CardTitle className="text-lg font-display">SGPA Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sgpaDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passfail">
          <Card className="card-glow">
            <CardHeader><CardTitle className="text-lg font-display">Pass / Fail Ratio</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={passFailData} cx="50%" cy="50%" outerRadius={120} innerRadius={60} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {passFailData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card className="card-glow">
            <CardHeader><CardTitle className="text-lg font-display">Subject-wise Grade Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectGradeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="subject" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
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
      <Card className="card-glow">
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
  );
}
