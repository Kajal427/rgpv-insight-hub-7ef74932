import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, User, Clock, LogOut, BarChart3, Mail, Building, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CaptchaDialog } from "@/components/CaptchaDialog";

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

  // CAPTCHA flow state
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lastResult, setLastResult] = useState<{ name: string; status: string } | null>(null);
  const sessionRef = useRef<SessionData | null>(null);

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

  // Abort ref for cancellation
  const abortRef = useRef(false);

  // Initialize a new session (get captcha)
  const initSession = useCallback(async (): Promise<{ captchaImage: string; sessionData: SessionData } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: { action: "init", program },
      });
      if (error || !data?.success) return null;
      return { captchaImage: data.captchaImage, sessionData: data.sessionData };
    } catch {
      return null;
    }
  }, [program]);

  // AI solve captcha
  const solveCaptcha = useCallback(async (captchaImage: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: { action: "solve-captcha", captchaImage },
      });
      if (error || !data?.success) return null;
      return data.answer;
    } catch {
      return null;
    }
  }, []);

  // Submit result for one student
  const submitOne = useCallback(async (
    enrollment: string, captchaAnswer: string, sessionData: SessionData
  ): Promise<{ success: boolean; result?: StudentResult; nextSession?: any; needsRetry?: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: { action: "submit", enrollment, semester, captchaAnswer, sessionData },
      });
      if (error || !data?.success) {
        return { success: false, needsRetry: data?.needsRetry, error: data?.error || error?.message };
      }
      return { success: true, result: data.result, nextSession: data.nextSession };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [semester]);

  // Fully automated processing loop
  const processAllStudents = useCallback(async (enrollmentList: string[]) => {
    abortRef.current = false;
    setCaptchaOpen(true);
    setCaptchaLoading(true);
    setCaptchaError(null);
    setCaptchaImage(null);
    setLastResult(null);

    let session = await initSession();
    if (!session) {
      setCaptchaError("Failed to connect to RGPV. Please try again.");
      setCaptchaLoading(false);
      return;
    }

    for (let i = 0; i < enrollmentList.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      setCaptchaImage(session.captchaImage);

      // Try up to 3 times per student (captcha may be wrong)
      let succeeded = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (abortRef.current) break;

        setCaptchaLoading(true);
        setCaptchaError(null);

        // AI solve
        const answer = await solveCaptcha(session.captchaImage);
        if (!answer) {
          // Get new captcha and retry
          session = await initSession();
          if (!session) {
            setCaptchaError("Lost connection to RGPV server.");
            setCaptchaLoading(false);
            return;
          }
          setCaptchaImage(session.captchaImage);
          continue;
        }

        // Submit
        const res = await submitOne(enrollmentList[i], answer, session.sessionData);
        if (res.success && res.result) {
          setResults((prev) => {
            const updated = [...prev, res.result!];
            localStorage.setItem("rgpv_results", JSON.stringify(updated));
            localStorage.setItem("rgpv_meta", JSON.stringify({ program, semester, fetchedAt: new Date().toISOString() }));
            return updated;
          });
          setLastResult({ name: res.result.name, status: res.result.status });

          // Use next session if available, otherwise init new
          if (res.nextSession) {
            session = { captchaImage: res.nextSession.captchaImage, sessionData: res.nextSession.sessionData };
          } else if (i < enrollmentList.length - 1) {
            const newSession = await initSession();
            if (!newSession) {
              setCaptchaError("Lost connection to RGPV server.");
              setCaptchaLoading(false);
              return;
            }
            session = newSession;
          }
          succeeded = true;
          break;
        } else if (res.needsRetry) {
          // Wrong captcha — get new session and retry
          session = await initSession();
          if (!session) {
            setCaptchaError("Lost connection to RGPV server.");
            setCaptchaLoading(false);
            return;
          }
          setCaptchaImage(session.captchaImage);
          continue;
        } else {
          // Non-retryable error (no results for this student) — skip
          setResults((prev) => [...prev, {
            enrollment: enrollmentList[i], name: "No Result", sgpa: "N/A", cgpa: "N/A", status: "Error", subjects: [],
          }]);
          // Init new session for next student
          if (i < enrollmentList.length - 1) {
            const newSession = await initSession();
            if (!newSession) {
              setCaptchaError("Lost connection to RGPV server.");
              setCaptchaLoading(false);
              return;
            }
            session = newSession;
          }
          succeeded = true;
          break;
        }
      }

      if (!succeeded && !abortRef.current) {
        // 3 attempts failed — skip student
        setResults((prev) => [...prev, {
          enrollment: enrollmentList[i], name: "Skipped", sgpa: "N/A", cgpa: "N/A", status: "Skipped", subjects: [],
        }]);
        if (i < enrollmentList.length - 1) {
          const newSession = await initSession();
          if (newSession) session = newSession;
        }
      }
    }

    setCaptchaLoading(false);
    setCaptchaOpen(false);
    toast({ title: "All results fetched!", description: `Processed ${enrollmentList.length} students.` });
  }, [initSession, solveCaptcha, submitOne, program, semester, toast]);

  // CSV upload handler
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
    setCurrentIdx(0);
    setResults([]);
    toast({ title: `Found ${toFetch.length} enrollments`, description: "Auto-fetching results with AI CAPTCHA solving..." });
    processAllStudents(toFetch);
  };

  const handleCancel = () => {
    abortRef.current = true;
    setCaptchaOpen(false);
    setCaptchaLoading(false);
    if (results.length > 0) {
      localStorage.setItem("rgpv_results", JSON.stringify(results));
      localStorage.setItem("rgpv_meta", JSON.stringify({ program, semester, fetchedAt: new Date().toISOString() }));
      toast({ title: "Cancelled", description: `Saved ${results.length} results fetched so far.` });
    }
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
            Upload a CSV with enrollment numbers. You'll solve a CAPTCHA for each student to fetch their results.
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
              <Link to="/analysis">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="h-4 w-4" /> View Analysis
                </Button>
              </Link>
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
      </div>
      <Footer />

      {/* Auto CAPTCHA Progress Dialog */}
      <CaptchaDialog
        open={captchaOpen}
        captchaImage={captchaImage}
        currentEnrollment={enrollments[currentIdx] || ""}
        currentIndex={currentIdx}
        totalCount={enrollments.length}
        loading={captchaLoading}
        error={captchaError}
        onSubmit={() => {}}
        onSkip={() => {}}
        onRetry={() => {}}
        onCancel={handleCancel}
        lastResult={lastResult}
      />
    </div>
  );
};

export default Dashboard;
