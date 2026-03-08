import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, User, Clock, LogOut, BarChart3, Mail, Building, Loader2, Download, FileUp, Eye, EyeOff, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CaptchaDialog } from "@/components/CaptchaDialog";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { ActivityHistory, logActivity } from "@/components/ActivityHistory";
import { fetchQueue, StudentResult, QueueState } from "@/lib/fetchQueue";

const PROGRAMS = ["B.E.", "B.Tech.", "M.C.A.", "B.Pharmacy", "M.E.", "M.Tech.", "Diploma", "M.B.A."];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

// Dark theme utility classes
const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";
const labelClasses = "text-sm font-medium text-[hsl(230,15%,55%)] mb-1 block";
const selectClasses = "w-full rounded-md border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)] px-3 py-2 text-sm text-white";

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

  const [queueState, setQueueState] = useState<QueueState>(fetchQueue.getState());
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const prevRunningRef = useRef(false);

  useEffect(() => {
    const initial = fetchQueue.getState();
    setQueueState(initial);
    if (initial.running) {
      setResults(initial.results);
      setCaptchaOpen(true);
    }
    const unsub = fetchQueue.subscribe((state) => {
      setQueueState(state);
      setResults([...state.results]);
      if (state.manualCaptcha) setCaptchaOpen(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (prevRunningRef.current && !queueState.running) {
      setCaptchaOpen(false);
      const successCount = queueState.results.filter((r) => r.name !== "Fetch Failed").length;
      logActivity("result_fetch", { program: queueState.program, semester: queueState.semester, total: successCount });
      toast({ title: "Done!", description: `Fetched results for ${successCount} of ${queueState.enrollments.length} students.` });
    }
    prevRunningRef.current = queueState.running;
  }, [queueState.running, queueState.results, queueState.enrollments.length, queueState.program, queueState.semester, toast]);

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

  useEffect(() => {
    if (!fetchQueue.getState().running) {
      try {
        const saved = localStorage.getItem("rgpv_results");
        if (saved) setResults(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleLogout = async () => {
    await logActivity("logout");
    await supabase.auth.signOut();
    navigate("/");
  };

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
    toast({ title: `Found ${toFetch.length} enrollments`, description: "Auto-fetching results with AI CAPTCHA solving..." });
    logActivity("csv_upload", { count: toFetch.length });
    setCaptchaOpen(true);
    fetchQueue.start(toFetch, program, semester);
  };

  const retryFailed = () => {
    const failed = results.filter((r) => (r.status === "Error" || r.name === "Fetch Failed") && r.status !== "Not Found");
    if (failed.length === 0) return;
    const failedEnrollments = failed.map((r) => r.enrollment);
    const successfulResults = results.filter((r) => r.status !== "Error" && r.name !== "Fetch Failed");
    setCaptchaOpen(true);
    fetchQueue.start(failedEnrollments, program, semester, successfulResults);
  };

  const handleCancel = () => {
    fetchQueue.stop();
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
    logActivity("export_excel", { program, semester, count: valid.length });
  };

  const queueProgress = queueState.enrollments.length > 0
    ? (queueState.completedCount / queueState.enrollments.length) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(230,35%,10%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(220,60%,65%)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(230,35%,10%)]">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <Button variant="outline" size="sm" className="gap-2 border-[hsl(230,20%,20%)] text-[hsl(230,20%,60%)] hover:bg-[hsl(240,50%,55%,0.1)] hover:text-white" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Background Fetch Status Bar */}
        {queueState.running && !captchaOpen && (
          <div
            className={`${cardClasses} p-4 mb-6 cursor-pointer hover:border-[hsl(240,50%,45%,0.4)] transition-colors border-[hsl(240,50%,45%,0.3)]`}
            onClick={() => setCaptchaOpen(true)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 text-[hsl(220,60%,65%)] animate-spin" />
                <span className="font-medium text-white">Fetching results in background...</span>
                <span className="text-[hsl(230,15%,50%)]">
                  {queueState.completedCount} / {queueState.enrollments.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)]" onClick={(e) => { e.stopPropagation(); setCaptchaOpen(true); }}>
                  <Eye className="h-3 w-3" /> View Details
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                  Stop
                </Button>
              </div>
            </div>
            <Progress value={queueProgress} className="h-2" />
            {queueState.error && (
              <p className="text-xs text-red-400 mt-1">{queueState.error}</p>
            )}
          </div>
        )}

        {/* Faculty Details — Collapsible */}
        {profile && (
          <div className={`${cardClasses} p-6 mb-8`}>
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setShowProfile(!showProfile)}
            >
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-[hsl(220,60%,65%)]" />
                {profile.full_name}
              </h2>
              <span className={`text-[hsl(230,15%,50%)] transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`}>
                ▾
              </span>
            </div>
            {showProfile && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 animate-fade-in">
                {[
                  { label: "Email", value: profile.email, icon: Mail },
                  { label: "Department", value: profile.department, icon: Building },
                  { label: "Registered On", value: profile.created_at, icon: Clock },
                  { label: "Last Login", value: profile.last_sign_in, icon: Clock },
                ].map((item) => (
                  <div key={item.label} className="bg-[hsl(230,30%,10%)] rounded-lg p-4 flex items-start gap-3 border border-[hsl(230,20%,18%)]">
                    <item.icon className="h-4 w-4 text-[hsl(220,60%,65%)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[hsl(230,15%,45%)] mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link to="/upload-analysis" className="block">
            <div className={`${cardClasses} p-6 hover:border-[hsl(240,50%,45%,0.4)] transition-all group cursor-pointer`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[hsl(240,50%,55%,0.15)] group-hover:bg-[hsl(240,50%,55%,0.25)] transition-colors">
                  <FileUp className="h-6 w-6 text-[hsl(220,60%,65%)]" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white">Upload & Analyze Excel</h3>
                  <p className="text-sm text-[hsl(230,15%,50%)]">Upload a previously exported result sheet for full analysis</p>
                </div>
              </div>
            </div>
          </Link>
          <Link to="/analysis" className="block">
            <div className={`${cardClasses} p-6 hover:border-[hsl(240,50%,45%,0.4)] transition-all group cursor-pointer`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[hsl(174,60%,30%,0.15)] group-hover:bg-[hsl(174,60%,30%,0.25)] transition-colors">
                  <BarChart3 className="h-6 w-6 text-[hsl(174,72%,50%)]" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white">View Latest Analysis</h3>
                  <p className="text-sm text-[hsl(230,15%,50%)]">See charts and insights from your last fetched results</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* CSV Upload */}
        <div className={`${cardClasses} p-6 mb-8`}>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <FileSpreadsheet className="h-5 w-5 text-[hsl(220,60%,65%)]" /> Upload CSV — Fetch from result.rgpv.ac.in
          </h2>
          <p className="text-sm text-[hsl(230,15%,50%)] mb-4">
            Upload a CSV with enrollment numbers. Results will be fetched automatically using AI-powered CAPTCHA solving.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClasses}>Program</label>
              <select value={program} onChange={(e) => setProgram(e.target.value)} className={selectClasses}>
                {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={selectClasses}>
                {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="border-2 border-dashed border-[hsl(230,20%,20%)] rounded-lg p-8 text-center hover:border-[hsl(240,50%,45%,0.4)] transition-colors">
            <Upload className="h-10 w-10 text-[hsl(230,15%,40%)] mx-auto mb-3" />
            <p className="text-sm text-[hsl(230,15%,50%)] mb-2">Drag & drop or click to upload CSV</p>
            <Input type="file" accept=".csv" onChange={handleCsvUpload} className="max-w-xs mx-auto bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white" disabled={queueState.running} />
          </div>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className={`${cardClasses} p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-[hsl(220,60%,65%)]" /> Fetched Results ({results.length} students)
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(230,15%,50%)] hover:bg-[hsl(240,50%,55%,0.1)]" onClick={() => { setResults([]); localStorage.removeItem("rgpv_results"); }} disabled={queueState.running} title="Clear results">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                {results.some((r) => (r.status === "Error" || r.name === "Fetch Failed") && r.status !== "Not Found") && !queueState.running && (
                  <Button size="sm" className="gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30" onClick={retryFailed}>
                    <Loader2 className="h-4 w-4" /> Retry Failed ({results.filter((r) => (r.status === "Error" || r.name === "Fetch Failed") && r.status !== "Not Found").length})
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2 border-[hsl(230,20%,20%)] text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)]" onClick={exportToExcel}>
                  <Download className="h-4 w-4" /> Export Excel
                </Button>
                <Link to="/analysis">
                  <Button variant="outline" size="sm" className="gap-2 border-[hsl(230,20%,20%)] text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)]">
                    <BarChart3 className="h-4 w-4" /> View Analysis
                  </Button>
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(230,20%,20%)]">
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">#</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Enrollment</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">SGPA</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">CGPA</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.enrollment} className="border-b border-[hsl(230,20%,18%)] hover:bg-[hsl(240,50%,55%,0.05)] transition-colors">
                      <td className="py-3 px-4 text-[hsl(230,15%,45%)]">{i + 1}</td>
                      <td className="py-3 px-4 font-mono text-white">{r.enrollment}</td>
                      <td className="py-3 px-4 text-white">{r.name}</td>
                      <td className="py-3 px-4 font-semibold text-[hsl(220,60%,65%)]">{r.sgpa}</td>
                      <td className="py-3 px-4 text-white">{r.cgpa}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.status === "PASS" || r.status === "Pass"
                            ? "bg-green-500/15 text-green-400"
                            : r.status === "Skipped"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : r.status === "Not Found"
                            ? "bg-orange-500/15 text-orange-400"
                            : r.status === "Error" || r.status === "FAIL" || r.status === "Fail"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-[hsl(230,20%,18%)] text-[hsl(230,15%,50%)]"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.subjects && r.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.subjects.map((s, si) => (
                              <span key={si} className="px-1.5 py-0.5 bg-[hsl(230,30%,18%)] rounded text-xs font-mono text-[hsl(230,15%,60%)]">
                                {s.code}:{s.grade}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[hsl(230,15%,40%)] text-xs">—</span>
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
          <div className="mb-8">
            <AnalysisDashboard results={results} program={program} semester={semester} />
          </div>
        )}
      </div>

      {/* Activity History — above footer */}
      <div className="container mx-auto px-4 pb-8">
        <ActivityHistory />
      </div>

      <Footer />

      <CaptchaDialog
        open={captchaOpen}
        currentEnrollment={queueState.enrollments[queueState.currentIndex] || ""}
        currentIndex={queueState.currentIndex}
        totalCount={queueState.enrollments.length}
        error={queueState.error}
        onCancel={handleCancel}
        lastResult={queueState.lastResult}
        completedCount={queueState.completedCount}
        manualCaptcha={queueState.manualCaptcha}
        onManualSubmit={(text) => fetchQueue.submitManualCaptcha(text)}
        onManualSkip={() => fetchQueue.skipManualCaptcha()}
        onMinimize={() => setCaptchaOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
