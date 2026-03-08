import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, StopCircle, Keyboard, SkipForward, Send } from "lucide-react";

export interface ManualCaptchaData {
  enrollment: string;
  captchaImage: string;
  sessionData: {
    cookies: string;
    formFields: Record<string, string>;
    resultPageUrl: string;
  };
}

interface CaptchaDialogProps {
  open: boolean;
  currentEnrollment: string;
  currentIndex: number;
  totalCount: number;
  error: string | null;
  onCancel: () => void;
  lastResult: { name: string; status: string } | null;
  completedCount: number;
  manualCaptcha: ManualCaptchaData | null;
  onManualSubmit: (captchaText: string) => void;
  onManualSkip: () => void;
  onMinimize?: () => void;
}

export function CaptchaDialog({
  open,
  currentEnrollment,
  totalCount,
  error,
  onCancel,
  lastResult,
  completedCount,
  manualCaptcha,
  onManualSubmit,
  onManualSkip,
}: CaptchaDialogProps) {
  const [manualInput, setManualInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    setSubmitting(true);
    onManualSubmit(manualInput.trim().toUpperCase());
    setManualInput("");
    setSubmitting(false);
  };

  const handleSkip = () => {
    setManualInput("");
    onManualSkip();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{manualCaptcha ? "Manual CAPTCHA Entry" : "Auto-Fetching Results"}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount} / {totalCount}
            </span>
          </DialogTitle>
          <DialogDescription>
            {manualCaptcha
              ? `AI couldn't solve CAPTCHA for ${manualCaptcha.enrollment}. Type it manually to continue.`
              : "AI is automatically solving CAPTCHAs and fetching results."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Progress value={progress} className="h-3" />

          {manualCaptcha ? (
            // Manual CAPTCHA entry mode
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Enrollment: <span className="font-mono font-semibold text-foreground">{manualCaptcha.enrollment}</span>
                </p>
                <div className="bg-secondary/50 rounded-lg p-4 inline-block">
                  <img
                    src={manualCaptcha.captchaImage}
                    alt="CAPTCHA"
                    className="h-14 mx-auto select-none"
                    draggable={false}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type CAPTCHA text..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  maxLength={7}
                  className="font-mono text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim() || submitting}
                >
                  <Send className="h-4 w-4" /> Submit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleSkip}
                >
                  <SkipForward className="h-4 w-4" /> Skip
                </Button>
              </div>
            </div>
          ) : (
            // Auto-fetch progress mode
            <>
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Now fetching: </span>
                  <span className="font-mono font-semibold text-foreground">{currentEnrollment}</span>
                </div>
              </div>

              {lastResult && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                  lastResult.status.toLowerCase().includes("pass")
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                }`}>
                  {lastResult.status.toLowerCase().includes("pass") ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>Last: {lastResult.name} — {lastResult.status}</span>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="destructive" size="sm" className="gap-2" onClick={onCancel}>
            <StopCircle className="h-4 w-4" /> Stop Fetching
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
