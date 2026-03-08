import { useState } from "react";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GradeCard } from "@/components/GradeCard";

type SubjectGrade = { code: string; grade: string };
type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

type ManualFallback = {
  captchaImage: string;
  sessionData: any;
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
  const [manualFallback, setManualFallback] = useState<ManualFallback | null>(null);
  const [manualCaptcha, setManualCaptcha] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
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
    setManualFallback(null);

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
        } else if (data?.manualFallback) {
          setManualFallback(data.manualFallback);
          setError("AI couldn't solve the CAPTCHA. Please solve it manually below.");
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

  const handleManualSubmit = async () => {
    if (!manualFallback || !manualCaptcha.trim()) return;
    setSubmittingManual(true);
    const trimmed = enrollment.trim().toUpperCase();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: {
          action: "submit",
          enrollment: trimmed,
          semester,
          captchaAnswer: manualCaptcha.trim(),
          sessionData: manualFallback.sessionData,
        },
      });

      if (data?.success && data?.result) {
        setResult(data.result as StudentResult);
        setManualFallback(null);
        setError(null);
      } else {
        const msg = data?.error || fnError?.message || "Wrong CAPTCHA or fetch failed";
        toast({ title: "Failed", description: msg, variant: "destructive" });
        // If wrong captcha, try to get a new one by re-searching
        if (/captcha/i.test(msg)) {
          setManualCaptcha("");
          handleSearch();
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingManual(false);
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
      {error && !manualFallback && (
        <div className={`${cardClasses} p-6 border-red-500/30`}>
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2 gap-2 text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)]" onClick={handleSearch}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Manual CAPTCHA Fallback */}
      {manualFallback && (
        <div className={`${cardClasses} p-6 border-orange-500/30 animate-fade-in`}>
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-orange-400" /> Manual CAPTCHA Required
          </h4>
          <p className="text-sm text-[hsl(230,15%,50%)] mb-4">AI couldn't solve this CAPTCHA automatically. Please type the characters you see below:</p>
          <div className="flex items-center gap-4">
            <img
              src={manualFallback.captchaImage}
              alt="CAPTCHA"
              className="h-14 rounded border border-[hsl(230,20%,20%)] bg-white"
            />
            <input
              type="text"
              value={manualCaptcha}
              onChange={(e) => setManualCaptcha(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              placeholder="Enter CAPTCHA"
              maxLength={6}
              className="w-36 rounded-md border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)] px-3 py-2 text-sm text-white font-mono tracking-widest placeholder:text-[hsl(230,15%,35%)] focus:outline-none focus:border-[hsl(240,50%,45%)]"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={submittingManual || !manualCaptcha.trim()}
              className="gap-2 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white"
            >
              {submittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
      )}

      {/* Grade Card Visualization */}
      {result && (
        <GradeCard result={result} program={program} semester={semester} />
      )}

      {!result && !error && !loading && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Enter an enrollment number above to search for a student's result</p>
        </div>
      )}
    </div>
  );
}
