import { User, Award, BookOpen, Download, TrendingUp, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useRef } from "react";
import html2canvas from "html2canvas";
import jspdf from "jspdf";

type SubjectGrade = { code: string; grade: string };
type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

interface GradeCardProps {
  result: StudentResult;
  program: string;
  semester: string;
}

const GRADE_ORDER = ["O", "A+", "A", "B+", "B", "C", "D", "F"];
const GRADE_COLORS: Record<string, string> = {
  "O": "hsl(142, 71%, 45%)",
  "A+": "hsl(152, 60%, 48%)",
  "A": "hsl(174, 62%, 47%)",
  "B+": "hsl(200, 65%, 50%)",
  "B": "hsl(220, 60%, 55%)",
  "C": "hsl(38, 80%, 55%)",
  "D": "hsl(25, 80%, 55%)",
  "F": "hsl(0, 70%, 55%)",
};

function getGradeDistribution(subjects: { code: string; grade: string }[]) {
  const counts: Record<string, number> = {};
  subjects.forEach((s) => {
    const g = s.grade.toUpperCase();
    counts[g] = (counts[g] || 0) + 1;
  });
  return GRADE_ORDER.filter((g) => counts[g]).map((g) => ({
    name: g,
    value: counts[g],
    color: GRADE_COLORS[g] || "hsl(230,15%,40%)",
  }));
}

function getSgpaColor(sgpa: number) {
  if (sgpa >= 9) return "text-green-400";
  if (sgpa >= 7) return "text-primary";
  if (sgpa >= 5) return "text-yellow-400";
  return "text-red-400";
}

export function GradeCard({ result, program, semester }: GradeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pieData = getGradeDistribution(result.subjects);
  const sgpaNum = parseFloat(result.sgpa) || 0;
  const cgpaNum = parseFloat(result.cgpa) || 0;
  const totalSubjects = result.subjects.length;
  const passedSubjects = result.subjects.filter((s) => s.grade.toUpperCase() !== "F").length;

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jspdf({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, pdfWidth, pdfHeight);
    pdf.save(`${result.enrollment}_grade_card.pdf`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2 border-border text-foreground hover:bg-accent">
          <Download className="h-4 w-4" /> Download Grade Card
        </Button>
      </div>

      <div ref={cardRef} className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">{result.name}</h2>
              <p className="font-mono text-sm text-muted-foreground mt-0.5">{result.enrollment}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" /> {program} — Sem {semester}
                </Badge>
                <Badge className={`text-xs ${/pass/i.test(result.status) ? "bg-green-500/15 text-green-500 border-green-500/20" : "bg-red-500/15 text-red-500 border-red-500/20"}`}>
                  {result.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-5">
          {[
            { label: "SGPA", value: result.sgpa, icon: Award, colorClass: getSgpaColor(sgpaNum) },
            { label: "CGPA", value: result.cgpa, icon: TrendingUp, colorClass: getSgpaColor(cgpaNum) },
            { label: "Subjects", value: `${passedSubjects}/${totalSubjects}`, icon: BookOpen, colorClass: "text-primary" },
            { label: "Pass Rate", value: `${totalSubjects ? Math.round((passedSubjects / totalSubjects) * 100) : 0}%`, icon: BarChart3, colorClass: passedSubjects === totalSubjects ? "text-green-400" : "text-yellow-400" },
          ].map((item) => (
            <div key={item.label} className="bg-muted/50 rounded-xl p-4 border border-border text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-1.5 ${item.colorClass}`} />
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl font-bold font-display ${item.colorClass}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Subject Table */}
        {result.subjects.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">All Subjects</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {result.subjects.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2.5 border border-border">
                  <span className="font-mono text-sm text-muted-foreground">{s.code}</span>
                  <Badge
                    className="font-mono text-xs border"
                    style={{
                      backgroundColor: `${GRADE_COLORS[s.grade.toUpperCase()] || "hsl(230,15%,40%)"}20`,
                      color: GRADE_COLORS[s.grade.toUpperCase()] || "hsl(var(--muted-foreground))",
                      borderColor: `${GRADE_COLORS[s.grade.toUpperCase()] || "hsl(230,15%,40%)"}40`,
                    }}
                  >
                    {s.grade}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground tracking-wide">Generated by RGPV Analyzer • {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
