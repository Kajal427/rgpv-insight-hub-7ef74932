import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, User, Clock, LogOut, BarChart3, Mail, Building, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SubjectGrade = { code: string; grade: string };

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

const PROGRAMS = ["B.E.", "B.Tech.", "M.C.A.", "B.Pharmacy", "M.E.", "M.Tech.", "Diploma", "M.B.A."];
const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [program, setProgram] = useState("B.Tech.");
  const [semester, setSemester] = useState("1");
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    department: string;
    created_at: string;
    last_sign_in: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        toast({ title: "Error loading profile", variant: "destructive" });
      } else {
        setProfile({
          full_name: data.full_name,
          email: session.user.email || "",
          department: data.department,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const parseCsvAndFetch = async (file: File) => {
    setCsvFile(file);
    setFetching(true);
    setResults([]);
    setFetchProgress("Reading CSV file...");

    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      const enrollments: string[] = [];
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        const enrollCol = cols.find((c) => /^[0-9]{4}[A-Z]{2,4}[0-9]{4,6}$/i.test(c));
        if (enrollCol) enrollments.push(enrollCol.toUpperCase());
      }

      if (enrollments.length === 0) {
        toast({ title: "No enrollment numbers found", description: "CSV should contain enrollment numbers like 0827CS211001", variant: "destructive" });
        setFetching(false);
        setFetchProgress("");
        return;
      }

      const toFetch = enrollments.slice(0, 50);
      setFetchProgress(`Fetching results for ${toFetch.length} students from result.rgpv.ac.in...`);
      toast({ title: `Processing ${toFetch.length} students`, description: `Program: ${program}, Semester: ${semester}` });

      const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
        body: { enrollments: toFetch, semester, program },
      });

      if (error) {
        toast({ title: "Fetch failed", description: error.message || "Could not fetch results. Please try again.", variant: "destructive" });
      } else if (data?.results) {
        setResults(data.results);
        const successCount = data.results.filter((r: StudentResult) => r.status !== "Error" && r.name !== "Fetch Failed").length;
        toast({ title: "Results fetched!", description: `Got ${successCount}/${data.results.length} results successfully` });
      }
    } catch (err: any) {
      toast({ title: "Error processing CSV", description: err.message, variant: "destructive" });
    } finally {
      setFetching(false);
      setFetchProgress("");
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseCsvAndFetch(file);
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

        {/* CSV Upload with Program & Semester Selection */}
        <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Upload CSV — Auto Fetch from result.rgpv.ac.in
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a CSV with student enrollment numbers (up to 50). Results will be fetched automatically using AI-powered CAPTCHA solving.
          </p>

          {/* Program & Semester selectors */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Program</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={fetching}
              >
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={fetching}
              >
                {SEMESTERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
            {fetching ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">{fetchProgress}</p>
                <p className="text-xs text-muted-foreground">This may take a few minutes for large batches...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  {csvFile ? csvFile.name : "Drag & drop or click to upload CSV"}
                </p>
                <Input type="file" accept=".csv" onChange={handleCsvUpload} className="max-w-xs mx-auto" />
              </>
            )}
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
                            : r.status === "Error" || r.status === "FAIL" || r.status === "Fail"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-yellow-500/10 text-yellow-500"
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
    </div>
  );
};

export default Dashboard;
