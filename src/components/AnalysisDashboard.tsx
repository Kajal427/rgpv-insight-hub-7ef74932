import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from "recharts";
import { TrendingUp, Users, Award, BarChart3, Trophy, Target, Zap, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SubjectGrade = { code: string; grade: string };
export type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

const GRADE_ORDER = ["O", "A+", "A", "B+", "B", "C+", "C", "D", "F"];
const GRADE_POINTS: Record<string, number> = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C+": 5, "C": 4, "D": 3, "F": 0 };

const CHART_COLORS = [
  "hsl(174, 72%, 40%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)", "hsl(198, 93%, 60%)", "hsl(350, 89%, 60%)",
  "hsl(160, 60%, 45%)", "hsl(30, 80%, 55%)", "hsl(210, 70%, 50%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  color: "hsl(var(--foreground))",
  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
};

interface AnalysisDashboardProps {
  results: StudentResult[];
  program?: string;
  semester?: string;
}

export function AnalysisDashboard({ results, program, semester }: AnalysisDashboardProps) {
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
    const median = [...sgpas].sort((a, b) => a - b)[Math.floor(sgpas.length / 2)];
    return {
      avg: avg.toFixed(2), max: Math.max(...sgpas).toFixed(2), min: Math.min(...sgpas).toFixed(2),
      median: median.toFixed(2), total: validResults.length,
      passPercent: ((passCount / validResults.length) * 100).toFixed(1),
      failPercent: (((validResults.length - passCount) / validResults.length) * 100).toFixed(1),
    };
  }, [validResults, passFailData]);

  const topPerformers = useMemo(
    () => [...validResults].sort((a, b) => parseFloat(b.sgpa) - parseFloat(a.sgpa)).slice(0, 10),
    [validResults]
  );

  const subjectRadarData = useMemo(() => {
    const subjectAvg: Record<string, { total: number; count: number }> = {};
    validResults.forEach((r) => {
      r.subjects?.forEach((s) => {
        const pts = GRADE_POINTS[s.grade];
        if (pts !== undefined) {
          if (!subjectAvg[s.code]) subjectAvg[s.code] = { total: 0, count: 0 };
          subjectAvg[s.code].total += pts;
          subjectAvg[s.code].count++;
        }
      });
    });
    return Object.entries(subjectAvg)
      .map(([code, { total, count }]) => ({ subject: code, avgGrade: +(total / count).toFixed(2) }))
      .slice(0, 8);
  }, [validResults]);

  const sgpaTrend = useMemo(() => {
    const sorted = [...validResults]
      .map((r) => ({ ...r, sgpaNum: parseFloat(r.sgpa) }))
      .filter((r) => !isNaN(r.sgpaNum))
      .sort((a, b) => a.sgpaNum - b.sgpaNum);
    const step = Math.max(1, Math.floor(sorted.length / 20));
    return sorted.filter((_, i) => i % step === 0).map((r, i) => ({
      idx: i + 1, sgpa: r.sgpaNum, name: r.name.split(" ")[0],
    }));
  }, [validResults]);

  if (validResults.length === 0) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Stats Banner */}
      {stats && (
        <div className="relative overflow-hidden rounded-2xl hero-gradient p-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Performance Overview</h2>
                <p className="text-white/70 text-sm">
                  {program && `${program} • `}Semester {semester || "—"} • {stats.total} students analyzed
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Students", value: stats.total, icon: Users, accent: "bg-blue-500/20" },
                { label: "Average SGPA", value: stats.avg, icon: TrendingUp, accent: "bg-teal-500/20" },
                { label: "Highest SGPA", value: stats.max, icon: Trophy, accent: "bg-amber-500/20" },
                { label: "Lowest SGPA", value: stats.min, icon: Target, accent: "bg-red-500/20" },
                { label: "Pass Rate", value: `${stats.passPercent}%`, icon: Zap, accent: "bg-green-500/20" },
                { label: "Median SGPA", value: stats.median, icon: GraduationCap, accent: "bg-purple-500/20" },
              ].map((s) => (
                <div key={s.label} className={`${s.accent} backdrop-blur-sm rounded-xl p-4 border border-white/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className="h-4 w-4 text-white/70" />
                    <span className="text-[11px] text-white/60 uppercase tracking-wider font-medium">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold font-display">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* SGPA Distribution */}
        <Card className="card-glow border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              SGPA Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sgpaDistribution} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <defs>
                    <linearGradient id="sgpaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(174, 72%, 50%)" />
                      <stop offset="100%" stopColor="hsl(174, 72%, 30%)" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="count" fill="url(#sgpaGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pass/Fail Donut */}
        <Card className="card-glow border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              Pass / Fail Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="passGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(152, 69%, 45%)" />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
                    </linearGradient>
                    <linearGradient id="failGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(350, 89%, 60%)" />
                      <stop offset="100%" stopColor="hsl(0, 84%, 50%)" />
                    </linearGradient>
                  </defs>
                  <Pie data={passFailData} cx="50%" cy="50%" outerRadius={110} innerRadius={70} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                    strokeWidth={0}>
                    <Cell fill="url(#passGrad)" />
                    <Cell fill="url(#failGrad)" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SGPA Trend Curve */}
        <Card className="card-glow border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-info" />
              SGPA Spread (Low → High)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sgpaTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="idx" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val.toFixed(2), "SGPA"]} />
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(210, 100%, 52%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(210, 100%, 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="sgpa" stroke="hsl(210, 100%, 52%)" fill="url(#areaGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subject Radar */}
        {subjectRadarData.length > 2 && (
          <Card className="card-glow border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning" />
                Subject Performance Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={subjectRadarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="Avg Grade" dataKey="avgGrade" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subject-wise Grade Distribution - Full Width */}
      {subjectGradeData.length > 0 && (
        <Card className="card-glow border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-foreground" />
              Subject-wise Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectGradeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis dataKey="subject" type="category" width={85} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {allGrades.map((grade, i) => (
                    <Bar key={grade} dataKey={grade} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === allGrades.length - 1 ? [0, 4, 4, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card className="card-glow border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" /> Top 10 Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {topPerformers.map((r, i) => (
              <div key={r.enrollment} className="relative flex items-center gap-4 rounded-xl px-4 py-3 bg-secondary/40 hover:bg-secondary/60 transition-colors group overflow-hidden">
                <span className="text-2xl font-black font-display shrink-0 w-10 text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.enrollment}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-mono text-sm font-bold">
                    {r.sgpa}
                  </Badge>
                  {r.cgpa !== "N/A" && (
                    <Badge variant="outline" className="font-mono text-xs">{r.cgpa}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
