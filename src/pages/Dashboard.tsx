import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, User, Clock, LogOut, BarChart3, Mail, Building, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CaptchaDialog } from "@/components/CaptchaDialog";
import { AnalysisSection } from "@/components/AnalysisSection";

type SubjectGrade = { code: string; grade: string };

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

type SessionData = {
  cookies: string;
  formFields: Record<string, string>;
  resultPageUrl: string;
};

const PROGRAMS = ["B.E.", "B.Tech.", "M.C.A.", "B.Pharmacy", "M.E.", "M.Tech.", "Diploma", "M.B.A."];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [program, setProgram] = useState("B.Tech.");
  const [semester, setSemester] = useState("1");
  const [profile, setProfile] = useState<{
    full_name: string; email: string; department: string; created_at: string; last_sign_in: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-fetch state
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lastResult, setLastResult] = useState<{ name: string; status: string } | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const abortRef = useRef(false);
  const sessionRef = useRef<SessionData | null>(null);
  const captchaRef = useRef<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
      if (error || !data) {
        toast({ title: "Error loading profile", variant: "destructive" });
      } else {
        setProfile({
          full_name: data.full_name, email: session.user.email || "", department: data.department,
          created_at: new Date(data.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }),
          last_sign_in: session.user.last_sign_in_at
            ? new Date(session.user.last_sign_in_at).toLocaleString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "N/A",
        });
      }
      setLoading(false);
    };
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  // Auto-fetch all results sequentially
  const autoFetchAll = useCallback(async (enrollmentList: string[]) => {
    abortRef.current = false;
    setCaptchaOpen(true);
    setCaptchaError(null);
    setCompletedCount(0);
    setLastResult(null);
    setResults([]);
    sessionRef.current = null;
    captchaRef.current = null;

    const fetched: StudentResult[] = [];

    for (let i = 0; i < enrollmentList.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      setCaptchaError(null);

      const enrollment = enrollmentList[i];
      const MAX_ENROLLMENT_RETRIES = 3;
      let succeeded = false;
      let finalError = "Failed";

      for (let attempt = 0; attempt < MAX_ENROLLMENT_RETRIES; attempt++) {
        if (abortRef.current) break;

        try {
          const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
            body: {
              action: "auto-fetch",
              enrollment,
              semester,
              program,
              sessionData: sessionRef.current,
              captchaImage: captchaRef.current,
            },
          });

          if (!error && data?.success) {
            const result = data.result as StudentResult;
            fetched.push(result);
            setLastResult({ name: result.name, status: result.status });
            succeeded = true;

            // Chain session for next student
            if (data.nextSession) {
              sessionRef.current = data.nextSession.sessionData;
              captchaRef.current = data.nextSession.captchaImage;
            } else {
              sessionRef.current = null;
              captchaRef.current = null;
            }
            break;
          }

          const errMsg = data?.error || error?.message || "Failed";
          finalError = errMsg;
          const isRateLimited = /rate limited/i.test(errMsg);
          const isTransient = isRateLimited || /timed out|unreachable|aborted|connection/i.test(errMsg);

          if (isTransient && attempt < MAX_ENROLLMENT_RETRIES - 1) {
            const waitMs = isRateLimited ? 15000 : 6000;
            setCaptchaError(`${enrollment}: ${isRateLimited ? "AI is busy" : errMsg}. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
            sessionRef.current = null;
            captchaRef.current = null;
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }

          break;
        } catch (err: any) {
          const errMsg = err?.message || "Failed";
          finalError = errMsg;
          const isTransient = /timed out|unreachable|aborted|connection|rate limited/i.test(errMsg);

          if (isTransient && attempt < MAX_ENROLLMENT_RETRIES - 1) {
            setCaptchaError(`${enrollment}: Temporary issue. Retrying in 6s...`);
            sessionRef.current = null;
            captchaRef.current = null;
            await new Promise((r) => setTimeout(r, 6000));
            continue;
          }

          break;
        }
      }

      if (!succeeded) {
        setCaptchaError(`${enrollment}: ${finalError}`);
        fetched.push({ enrollment, name: "Fetch Failed", sgpa: "N/A", cgpa: "N/A", status: "Error", subjects: [] });
        sessionRef.current = null;
        captchaRef.current = null;
      }

      setResults([...fetched]);
      setCompletedCount(i + 1);
      localStorage.setItem("rgpv_results", JSON.stringify(fetched));
      localStorage.setItem("rgpv_meta", JSON.stringify({ program, semester, fetchedAt: new Date().toISOString() }));

      // Delay between students to avoid AI rate limits
      if (i < enrollmentList.length - 1 && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    setCaptchaOpen(false);
    toast({ title: "Done!", description: `Fetched results for ${fetched.filter(r => r.name !== "Fetch Failed").length} of ${enrollmentList.length} students.` });
  }, [semester, program, toast]);

  // Start the flow after CSV upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const found: string[] = [];
    for (const line of lines) {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      const enrollCol = cols.find((c) => /^[0-9]{4}[A-Z]{2,4}[0-9]{4,6}$/i.test(c));
      if (enrollCol) found.push(enrollCol.toUpperCase());
    }
    if (found.length === 0) {
      toast({ title: "No enrollment numbers found", variant: "destructive" });
      return;
    }
    const toFetch = found.slice(0, 50);
    setEnrollments(toFetch);
    toast({ title: `Found ${toFetch.length} enrollments`, description: "Auto-fetching results with AI CAPTCHA solving..." });
    autoFetchAll(toFetch);
  };

  const handleCancel = () => {
    abortRef.current = true;
    setCaptchaOpen(false);
    if (results.length > 0) {
      toast({ title: "Stopped", description: `Saved ${results.length} results fetched so far.` });
    }
  };

  const exportToExcel = () => {
    const valid = results.filter((r) => r.name !== "Skipped" && r.name !== "Fetch Failed");
    if (valid.length === 0) return;

    const wsData = valid.map((r, i) => {
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

    const statsData = [
      { Metric: "Total Students", Value: valid.length },
      { Metric: "Pass Count", Value: valid.filter((r) => r.status.toLowerCase().includes("pass")).length },
      { Metric: "Pass %", Value: `${((valid.filter((r) => r.status.toLowerCase().includes("pass")).length / valid.length) * 100).toFixed(1)}%` },
      { Metric: "Program", Value: program },
      { Metric: "Semester", Value: semester },
      { Metric: "Exported At", Value: new Date().toLocaleString() },
    ];
    const ws2 = XLSX.utils.json_to_sheet(statsData);
    ws2["!cols"] = [{ wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    XLSX.writeFile(wb, `RGPV_Results_${program}_Sem${semester}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Faculty Details */}
        {profile && (
          <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Faculty Details
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Full Name", value: profile.full_name, icon: User },
                { label: "Email", value: profile.email, icon: Mail },
                { label: "Department", value: profile.department, icon: Building },
                { label: "Registered On", value: profile.created_at, icon: Clock },
                { label: "Last Login", value: profile.last_sign_in, icon: Clock },
              ].map((item) => (
                <div key={item.label} className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
                  <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSV Upload */}
        <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Upload CSV — Fetch from result.rgpv.ac.in
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a CSV with enrollment numbers. Results will be fetched automatically using AI-powered CAPTCHA solving.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Program</label>
              <select value={program} onChange={(e) => setProgram(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Drag & drop or click to upload CSV</p>
            <Input type="file" accept=".csv" onChange={handleCsvUpload} className="max-w-xs mx-auto" />
          </div>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Fetched Results ({results.length} students)
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel}>
                  <Download className="h-4 w-4" /> Export Excel
                </Button>
                <Link to="/analysis">
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="h-4 w-4" /> View Analysis
                  </Button>
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">#</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Enrollment</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">SGPA</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">CGPA</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.enrollment} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-4 font-mono">{r.enrollment}</td>
                      <td className="py-3 px-4">{r.name}</td>
                      <td className="py-3 px-4 font-semibold text-primary">{r.sgpa}</td>
                      <td className="py-3 px-4">{r.cgpa}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.status === "PASS" || r.status === "Pass"
                            ? "bg-green-500/10 text-green-500"
                            : r.status === "Skipped"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : r.status === "Error" || r.status === "FAIL" || r.status === "Fail"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.subjects && r.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.subjects.map((s, si) => (
                              <span key={si} className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">
                                {s.code}:{s.grade}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analysis Section */}
        {results.length > 0 && (
          <AnalysisSection results={results} program={program} semester={semester} />
        )}
      </div>
      <Footer />

      {/* CAPTCHA Dialog */}
      <CaptchaDialog
        open={captchaOpen}
        currentEnrollment={enrollments[currentIdx] || ""}
        currentIndex={currentIdx}
        totalCount={enrollments.length}
        error={captchaError}
        onCancel={handleCancel}
        lastResult={lastResult}
        completedCount={completedCount}
      />
    </div>
  );
};

export default Dashboard;
