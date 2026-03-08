import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, ArrowLeft, Mail, Lock, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setDone(true);
      toast({ title: "Password updated successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(230,35%,10%)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(250,40%,20%)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(174,72%,12%)_0%,transparent_50%)]" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[hsl(230,20%,55%)] hover:text-[hsl(220,60%,65%)] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        <div className="bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl p-8 shadow-[0_20px_60px_-15px_hsl(240,50%,15%,0.5)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-[hsl(240,50%,55%,0.2)] flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-[hsl(220,60%,65%)]" />
            </div>
            <span className="font-display text-lg font-bold text-white">Set New Password</span>
          </div>

          {done ? (
            <div className="text-center py-4">
              <p className="text-[hsl(174,72%,55%)] font-medium mb-4">✅ Password updated successfully!</p>
              <Link to="/login">
                <Button className="bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[hsl(230,15%,55%)]">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                  <Input
                    className="pl-10 bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:border-[hsl(240,50%,55%)] focus:ring-[hsl(240,50%,55%)]"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(230,15%,55%)]">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                  <Input
                    className="pl-10 bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:border-[hsl(240,50%,55%)] focus:ring-[hsl(240,50%,55%)]"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
