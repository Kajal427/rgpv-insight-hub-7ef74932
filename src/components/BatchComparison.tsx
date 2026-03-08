import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Upload, GitCompareArrows, TrendingUp, Users, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
};

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

const tooltipStyle = {
  backgroundColor: "hsl(230,30%,12%)",
  border: "1px solid hsl(230,20%,20%)",
  borderRadius: "0.75rem",
  color: "#fff",
};

function parseExcel(file: File): Promise<{ results: StudentResult[]; label: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
        
        const enrollKey = Object.keys(rows[0] || {}).find(k => /enroll/i.test(k)) || "Enrollment";
        const nameKey = Object.keys(rows[0] || {}).find(k => /name/i.test(k)) || "Name";
        const sgpaKey = Object.keys(rows[0] || {}).find(k => /sgpa/i.test(k)) || "SGPA";
        const cgpaKey = Object.keys(rows[0] || {}).find(k => /cgpa/i.test(k)) || "CGPA";
        const statusKey = Object.keys(rows[0] || {}).find(k => /status/i.test(k)) || "Status";

        const results: StudentResult[] = rows
          .filter(r => r[enrollKey])
          .map(r => ({
            enrollment: String(r[enrollKey] || ""),
            name: String(r[nameKey] || "Unknown"),
            sgpa: String(r[sgpaKey] || "0"),
            cgpa: String(r[cgpaKey] || "0"),
            status: String(r[statusKey] || "Unknown"),
          }));

        resolve({ results, label: file.name.replace(/\.[^.]+$/, "") });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
}

function getStats(results: StudentResult[]) {
  const sgpas = results.map(r => parseFloat(r.sgpa)).filter(n => !isNaN(n));
  const passCount = results.filter(r => /pass/i.test(r.status)).length;
  return {
    total: results.length,
    avg: sgpas.length > 0 ? (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2) : "0",
    max: sgpas.length > 0 ? Math.max(...sgpas).toFixed(2) : "0",
    min: sgpas.length > 0 ? Math.min(...sgpas).toFixed(2) : "0",
    passRate: results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : "0",
  };
}

export function BatchComparison() {
  const [batchA, setBatchA] = useState<{ results: StudentResult[]; label: string } | null>(null);
  const [batchB, setBatchB] = useState<{ results: StudentResult[]; label: string } | null>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: typeof setBatchA) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcel(file);
      if (data.results.length === 0) {
        toast({ title: "No valid data found in Excel", variant: "destructive" });
        return;
      }
      setter(data);
      toast({ title: `Loaded ${data.results.length} students from ${file.name}` });
    } catch {
      toast({ title: "Failed to parse Excel file", variant: "destructive" });
    }
  };

  const statsA = useMemo(() => batchA ? getStats(batchA.results) : null, [batchA]);
  const statsB = useMemo(() => batchB ? getStats(batchB.results) : null, [batchB]);

  const comparisonChart = useMemo(() => {
    if (!statsA || !statsB) return [];
    return [
      { metric: "Avg SGPA", [batchA!.label]: parseFloat(statsA.avg), [batchB!.label]: parseFloat(statsB.avg) },
      { metric: "Max SGPA", [batchA!.label]: parseFloat(statsA.max), [batchB!.label]: parseFloat(statsB.max) },
      { metric: "Min SGPA", [batchA!.label]: parseFloat(statsA.min), [batchB!.label]: parseFloat(statsB.min) },
      { metric: "Pass %", [batchA!.label]: parseFloat(statsA.passRate), [batchB!.label]: parseFloat(statsB.passRate) },
    ];
  }, [statsA, statsB, batchA, batchB]);

  const sgpaDistComparison = useMemo(() => {
    if (!batchA || !batchB) return [];
    const ranges = ["0-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10"];
    const getBuckets = (results: StudentResult[]) => {
      const b: Record<string, number> = {};
      ranges.forEach(r => b[r] = 0);
      results.forEach(r => {
        const s = parseFloat(r.sgpa);
        if (isNaN(s)) return;
        if (s < 4) b["0-4"]++;
        else if (s < 5) b["4-5"]++;
        else if (s < 6) b["5-6"]++;
        else if (s < 7) b["6-7"]++;
        else if (s < 8) b["7-8"]++;
        else if (s < 9) b["8-9"]++;
        else b["9-10"]++;
      });
      return b;
    };
    const bucketsA = getBuckets(batchA.results);
    const bucketsB = getBuckets(batchB.results);
    return ranges.map(r => ({
      range: r,
      [batchA.label]: bucketsA[r],
      [batchB.label]: bucketsB[r],
    }));
  }, [batchA, batchB]);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Batch A", data: batchA, setter: setBatchA, color: "hsl(174,72%,50%)" },
          { label: "Batch B", data: batchB, setter: setBatchB, color: "hsl(280,67%,55%)" },
        ].map((batch) => (
          <div key={batch.label} className={`${cardClasses} p-6`}>
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4" style={{ color: batch.color }} />
              {batch.label} {batch.data ? `— ${batch.data.label}` : ""}
            </h3>
            {batch.data ? (
              <div className="space-y-2">
                <p className="text-sm text-[hsl(230,15%,55%)]">{batch.data.results.length} students loaded</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:bg-red-500/10"
                  onClick={() => batch.setter(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[hsl(230,20%,20%)] rounded-lg p-6 text-center hover:border-[hsl(240,50%,45%,0.4)] transition-colors">
                <Upload className="h-8 w-8 text-[hsl(230,15%,40%)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(230,15%,50%)] mb-2">Upload exported Excel file</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleUpload(e, batch.setter)}
                  className="max-w-xs mx-auto text-sm text-[hsl(230,15%,55%)]"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Results */}
      {batchA && batchB && statsA && statsB && (
        <>
          {/* Stats Comparison */}
          <div className={`${cardClasses} p-6`}>
            <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-[hsl(220,60%,65%)]" />
              Side-by-Side Comparison
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Students", a: statsA.total, b: statsB.total, icon: Users },
                { label: "Avg SGPA", a: statsA.avg, b: statsB.avg, icon: TrendingUp },
                { label: "Max SGPA", a: statsA.max, b: statsB.max, icon: Trophy },
                { label: "Min SGPA", a: statsA.min, b: statsB.min, icon: Target },
                { label: "Pass Rate", a: `${statsA.passRate}%`, b: `${statsB.passRate}%`, icon: TrendingUp },
              ].map((stat) => (
                <div key={stat.label} className="bg-[hsl(230,30%,10%)] rounded-lg p-3 border border-[hsl(230,20%,18%)]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <stat.icon className="h-3.5 w-3.5 text-[hsl(230,15%,45%)]" />
                    <span className="text-[10px] text-[hsl(230,15%,45%)] uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={{ color: "hsl(174,72%,50%)" }}>{stat.a}</span>
                    <span className="text-[hsl(230,15%,35%)] text-xs">vs</span>
                    <span className="text-sm font-bold" style={{ color: "hsl(280,67%,55%)" }}>{stat.b}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-[hsl(230,30%,14%)] border-[hsl(230,20%,20%)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display text-white">Metrics Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChart} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,20%,20%)" opacity={0.5} />
                      <XAxis dataKey="metric" tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey={batchA.label} fill="hsl(174,72%,45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={batchB.label} fill="hsl(280,67%,50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[hsl(230,30%,14%)] border-[hsl(230,20%,20%)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display text-white">SGPA Distribution Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sgpaDistComparison} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,20%,20%)" opacity={0.5} />
                      <XAxis dataKey="range" tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(230,15%,55%)", fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey={batchA.label} fill="hsl(174,72%,45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={batchB.label} fill="hsl(280,67%,50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {(!batchA || !batchB) && (
        <div className={`${cardClasses} p-8 text-center`}>
          <GitCompareArrows className="h-12 w-12 text-[hsl(230,15%,30%)] mx-auto mb-3" />
          <p className="text-[hsl(230,15%,45%)]">Upload two Excel files above to compare batch results side-by-side</p>
        </div>
      )}
    </div>
  );
}
