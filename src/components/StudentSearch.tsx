import { useState } from "react";
import { Search, User, Award, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

const PROGRAMS = ["B.E.", "B.Tech.", "M.C.A.", "B.Pharmacy", "M.E.", "M.Tech.", "Diploma", "M.B.A."];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

export function StudentSearch() {
  const [enrollment, setEnrollment] = useState("");
  const [program, setProgram] = useState("B.Tech.");
  const [semester, setSemester] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    const trimmed = enrollment.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: "Enter an enrollment number", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: {
          action: "auto-fetch",
          enrollment: trimmed,
          semester,
          program,
        },
      });

      if (fnError || data?.error) {
        const msg = data?.error || fnError?.message || "Failed to fetch";
        if (/not found/i.test(msg)) {
          setError("Student not found. Check enrollment number and try again.");
        } else {
          setError(msg);
        }
        return;
      }

      if (data?.success && data?.result) {
        setResult(data.result as StudentResult);
      } else {
        setError("Could not fetch result. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className={`${cardClasses} p-6`}>
        <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-[hsl(220,60%,65%)]" />
          Search Student by Enrollment
        </h3>
        <div className="grid sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-[hsl(230,15%,55%)] mb-1 block">Enrollment No.</label>
            <input
              type="text"
              value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. 0901CS211001"
              className="w-full rounded-md border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)] px-3 py-2 text-sm text-white placeholder:text-[hsl(230,15%,35%)] focus:outline-none focus:border-[hsl(240,50%,45%)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[hsl(230,15%,55%)] mb-1 block">Program</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full rounded-md border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)] px-3 py-2 text-sm text-white"
            >
              {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[hsl(230,15%,55%)] mb-1 block">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-md border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)] px-3 py-2 text-sm text-white"
            >
              {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full gap-2 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={`${cardClasses} p-6 border-red-500/30`}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className={`${cardClasses} p-6 animate-fade-in`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-[hsl(240,50%,55%,0.15)] flex items-center justify-center">
                <User className="h-7 w-7 text-[hsl(220,60%,65%)]" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white">{result.name}</h3>
                <p className="text-sm font-mono text-[hsl(230,15%,50%)]">{result.enrollment}</p>
              </div>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${
                /pass/i.test(result.status)
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {result.status}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "SGPA", value: result.sgpa, icon: Award, color: "hsl(174,72%,50%)" },
              { label: "CGPA", value: result.cgpa, icon: Award, color: "hsl(38,92%,55%)" },
              { label: "Program", value: `${program} - Sem ${semester}`, icon: BookOpen, color: "hsl(220,60%,65%)" },
            ].map((item) => (
              <div key={item.label} className="bg-[hsl(230,30%,10%)] rounded-lg p-4 border border-[hsl(230,20%,18%)]">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  <span className="text-xs text-[hsl(230,15%,45%)] uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-xl font-bold font-display text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {result.subjects && result.subjects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[hsl(230,15%,55%)] mb-3">Subject-wise Grades</h4>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {result.subjects.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[hsl(230,30%,10%)] rounded-lg px-4 py-2.5 border border-[hsl(230,20%,18%)]"
                  >
                    <span className="font-mono text-sm text-[hsl(230,15%,60%)]">{s.code}</span>
                    <Badge
                      className={`font-mono text-xs ${
                        s.grade === "F"
                          ? "bg-red-500/15 text-red-400"
                          : s.grade === "O" || s.grade === "A+"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-[hsl(230,20%,18%)] text-[hsl(230,15%,55%)]"
                      }`}
                    >
                      {s.grade}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !error && !loading && (
        <div className={`${cardClasses} p-8 text-center`}>
          <Search className="h-12 w-12 text-[hsl(230,15%,30%)] mx-auto mb-3" />
          <p className="text-[hsl(230,15%,45%)]">Enter an enrollment number above to search for a student's result</p>
        </div>
      )}
    </div>
  );
}
