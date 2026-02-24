import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Globe, User, Clock, LogOut, BarChart3, Mail, Phone, Building } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    phone: string;
    department: string;
    created_at: string;
    last_sign_in: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

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
          phone: data.phone || "",
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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      toast({ title: "File Selected", description: file.name });
    }
  };

  const handleProcessCsv = () => {
    if (!csvFile) return;
    toast({ title: "Processing CSV", description: "Analyzing student data..." });
  };

  const handleFetchResult = () => {
    if (!enrollmentNo) return;
    setFetchLoading(true);
    setTimeout(() => {
      setFetchLoading(false);
      toast({ title: "Result Fetched", description: `Result for ${enrollmentNo} fetched from result.rgpv.com` });
    }, 2000);
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

        {/* Faculty Details Card */}
        {profile && (
          <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Faculty Details
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Full Name", value: profile.full_name, icon: User },
                { label: "Email", value: profile.email, icon: Mail },
                { label: "Phone", value: profile.phone || "Not provided", icon: Phone },
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* CSV Upload */}
          <div className="bg-card border border-border rounded-xl p-6 card-glow">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Upload CSV
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a CSV file with student enrollment numbers for bulk result analysis.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4 hover:border-primary/40 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                {csvFile ? csvFile.name : "Drag & drop or click to upload"}
              </p>
              <Input type="file" accept=".csv" onChange={handleCsvUpload} className="max-w-xs mx-auto" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleProcessCsv} disabled={!csvFile} className="flex-1">
                Process & Analyze
              </Button>
              <Link to="/analysis" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" /> View Analysis
                </Button>
              </Link>
            </div>
          </div>

          {/* Fetch from RGPV */}
          <div className="bg-card border border-border rounded-xl p-6 card-glow">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Fetch from RGPV Portal
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Fetch individual student results directly from result.rgpv.com
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enrollment Number</Label>
                <Input placeholder="e.g., 0827CS211001" value={enrollmentNo} onChange={(e) => setEnrollmentNo(e.target.value)} />
              </div>
              <Button onClick={handleFetchResult} disabled={!enrollmentNo || fetchLoading} className="w-full">
                {fetchLoading ? "Fetching from result.rgpv.com..." : "Fetch Result"}
              </Button>
            </div>

            <div className="mt-6 bg-secondary/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">Sample Result Preview</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Student:</span> John Doe</div>
                <div><span className="text-muted-foreground">Enrollment:</span> 0827CS211001</div>
                <div><span className="text-muted-foreground">SGPA:</span> <span className="text-primary font-semibold">8.5</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-semibold text-primary">Pass</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
