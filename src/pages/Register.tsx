import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, ArrowLeft, Mail, Lock, User, Check, X, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biomedical Engineering",
  "Applied Mathematics",
  "Physics",
  "Chemistry",
  "Management Studies",
];

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const inputClasses = "bg-[hsl(230,30%,10%)] border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:border-[hsl(240,50%,55%)] focus:ring-[hsl(240,50%,55%)]";

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  const passwordStrength = useMemo(() => {
    return passwordRules.map((rule) => ({
      ...rule,
      passed: rule.test(formData.password),
    }));
  }, [formData.password]);

  const allPasswordRulesPassed = passwordStrength.every((r) => r.passed);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    setOtpSent(false);
    setOtpVerified(false);
    setOtpValue("");
  }, [formData.email]);

  const handleSendOtp = async () => {
    if (!formData.email) {
      toast({ title: "Email Required", description: "Please enter your email first.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email: formData.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setCooldown(30);
      toast({ title: "OTP Sent!", description: "Check your email for the 6-digit code." });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the full 6-digit code.", variant: "destructive" });
      return;
    }
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email: formData.email, otp: otpValue },
      });
      if (error) throw error;
      if (!data?.verified) throw new Error(data?.error || "Invalid or expired OTP");
      setOtpVerified(true);
      toast({ title: "Email Verified!", description: "You can now complete registration." });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      toast({ title: "Email Not Verified", description: "Please verify your email with OTP first.", variant: "destructive" });
      return;
    }
    if (!allPasswordRulesPassed) {
      toast({ title: "Weak Password", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }
    if (!formData.department) {
      toast({ title: "Department Required", description: "Please select a department.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            department: formData.department,
          },
        },
      });
      if (error) throw error;
      toast({ title: "Registration Successful!", description: "Redirecting to dashboard..." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(230,35%,10%)] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(250,40%,20%)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(174,72%,12%)_0%,transparent_50%)]" />

      {/* Floating shapes */}
      <div className="absolute top-[15%] left-[10%] w-40 h-40 rounded-full border-[4px] border-[hsl(250,50%,35%)] opacity-15" />
      <div className="absolute bottom-[10%] right-[15%] w-24 h-24 bg-[hsl(240,50%,30%)] rounded-full opacity-10 blur-xl" />
      <div className="absolute top-[50%] right-[10%] w-5 h-5 bg-[hsl(200,80%,65%)] rounded-full opacity-25" />
      <div className="absolute bottom-[30%] left-[20%] w-3 h-3 bg-[hsl(0,60%,55%)] rounded-full opacity-25" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[hsl(230,20%,55%)] hover:text-[hsl(220,60%,65%)] mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl p-8 shadow-[0_20px_60px_-15px_hsl(240,50%,15%,0.5)]">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-[hsl(240,50%,55%,0.2)] flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[hsl(220,60%,65%)]" />
            </div>
            <span className="font-display text-lg font-bold text-white">Faculty Registration</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[hsl(230,15%,55%)]">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                <Input className={`pl-10 ${inputClasses}`} placeholder="Dr. John Doe" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(230,15%,55%)]">Email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                  <Input
                    className={`pl-10 ${inputClasses}`}
                    type="email"
                    placeholder="faculty@rgpv.ac.in"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={otpVerified}
                  />
                </div>
                {!otpVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-10 border-[hsl(230,20%,20%)] text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)] hover:text-white"
                    onClick={handleSendOtp}
                    disabled={otpSending || !formData.email || cooldown > 0}
                  >
                    {otpSending ? "Sending..." : cooldown > 0 ? `Resend (${cooldown}s)` : otpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                )}
                {otpVerified && (
                  <div className="flex items-center h-10 px-3 rounded-md bg-green-500/10 text-green-500 text-sm font-medium gap-1">
                    <ShieldCheck className="h-4 w-4" /> Verified
                  </div>
                )}
              </div>
            </div>

            {otpSent && !otpVerified && (
              <div className="space-y-2 p-4 rounded-lg border border-[hsl(230,20%,20%)] bg-[hsl(230,30%,10%)]">
                <Label className="text-sm text-[hsl(230,15%,55%)]">Enter 6-digit OTP sent to your email</Label>
                <div className="flex items-center gap-3">
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpValue.length !== 6}
                  >
                    {otpVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[hsl(230,15%,55%)]">Department</Label>
              <Select value={formData.department} onValueChange={(val) => setFormData({ ...formData, department: val })}>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(230,30%,14%)] border-[hsl(230,20%,20%)]">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-white hover:bg-[hsl(240,50%,55%,0.1)] focus:bg-[hsl(240,50%,55%,0.1)] focus:text-white">{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(230,15%,55%)]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
                <Input
                  className={`pl-10 ${inputClasses}`}
                  type="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              {formData.password && (
                <ul className="space-y-1 mt-2">
                  {passwordStrength.map((rule) => (
                    <li key={rule.label} className={`flex items-center gap-2 text-xs ${rule.passed ? "text-green-400" : "text-[hsl(230,15%,40%)]"}`}>
                      {rule.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" className="w-full bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white" disabled={loading || !allPasswordRulesPassed || !otpVerified}>
              {loading ? "Registering..." : "Register"}
            </Button>
            <p className="text-center text-sm text-[hsl(230,15%,45%)]">
              Already have an account?{" "}
              <Link to="/login" className="text-[hsl(220,60%,65%)] hover:underline">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
