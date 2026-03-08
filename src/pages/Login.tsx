import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, ArrowLeft, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/components/ActivityHistory";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[hsl(230,35%,10%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(220,60%,65%)]" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if user is blocked
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("user_id", signInData.user.id)
        .single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        toast({
          title: "Account Blocked",
          description: "Your account has been suspended by an administrator. Contact support for help.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await logActivity("login");
      toast({ title: "Login Successful!" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(230,35%,10%)] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(250,40%,20%)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(174,72%,12%)_0%,transparent_50%)]" />
      
      {/* Floating shapes */}
      <div className="absolute top-[10%] right-[15%] w-32 h-32 rounded-full border-[4px] border-[hsl(250,50%,35%)] opacity-20" />
      <div className="absolute bottom-[20%] left-[10%] w-20 h-20 bg-[hsl(240,50%,30%)] rounded-full opacity-10 blur-xl" />
      <div className="absolute top-[30%] left-[20%] w-4 h-4 bg-[hsl(200,80%,65%)] rounded-full opacity-30" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[hsl(230,20%,55%)] hover:text-[hsl(220,60%,65%)] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl p-8 shadow-[0_20px_60px_-15px_hsl(240,50%,15%,0.5)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-[hsl(240,50%,55%,0.2)] flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[hsl(220,60%,65%)]" />
            </div>
            <span className="font-display text-lg font-bold text-white">Faculty Login</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[hsl(230,15%,55%)]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                <Input
                  className="pl-10 bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:border-[hsl(240,50%,55%)] focus:ring-[hsl(240,50%,55%)]"
                  type="email"
                  placeholder="faculty@rgpv.ac.in"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[hsl(230,15%,55%)]">Password</Label>
                <button
                  type="button"
                  className="text-xs text-[hsl(220,60%,65%)] hover:underline"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: "Please enter your email first", variant: "destructive" });
                      return;
                    }
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({ title: "Password reset email sent!", description: "Check your inbox." });
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    }
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                <Input
                  className="pl-10 bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:border-[hsl(240,50%,55%)] focus:ring-[hsl(240,50%,55%)]"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-center text-sm text-[hsl(230,15%,45%)]">
              Don't have an account?{" "}
              <Link to="/register" className="text-[hsl(220,60%,65%)] hover:underline">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
