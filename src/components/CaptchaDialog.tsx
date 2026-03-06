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
import { Loader2, CheckCircle2, XCircle, StopCircle, KeyboardIcon, SkipForward } from "lucide-react";

export type ManualCaptchaData = {
  enrollment: string;
  sessionData: any;
  captchaImage: string;
} | null;

interface CaptchaDialogProps {
  open: boolean;
  currentEnrollment: string;
  currentIndex: number;
  totalCount: number;
  error: string | null;
  onCancel: () => void;
  lastResult: { name: string; status: string } | null;
  completedCount: number;
  // Manual CAPTCHA fallback
  manualCaptchaData: ManualCaptchaData;
  onManualSubmit: (captchaAnswer: string) => void;
  onManualSkip: () => void;
}

export function CaptchaDialog({
  open,
  currentEnrollment,
  currentIndex,
  totalCount,
  error,
  onCancel,
  lastResult,
  completedCount,
  manualCaptchaData,
  onManualSubmit,
  onManualSkip,
}: CaptchaDialogProps) {
  const [manualInput, setManualInput] = useState("");
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onManualSubmit(manualInput.trim().toUpperCase());
      setManualInput("");
    }
  };

  // Manual CAPTCHA mode
  if (manualCaptchaData) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyboardIcon className="h-5 w-5 text-primary" />
              Manual CAPTCHA — {manualCaptchaData.enrollment}
            </DialogTitle>
            <DialogDescription>
              Auto-solve failed for this enrollment. Enter the CAPTCHA text below to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-right">{completedCount} / {totalCount}</p>

            {manualCaptchaData.captchaImage && (
              <div className="flex justify-center bg-secondary/50 rounded-lg p-4">
                <img
                  src={manualCaptchaData.captchaImage}
                  alt="CAPTCHA"
                  className="h-16 border border-border rounded"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Enter CAPTCHA text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                className="font-mono uppercase"
                autoFocus
              />
              <Button size="sm" onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                Submit
              </Button>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setManualInput(""); onManualSkip(); }}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
            <Button variant="destructive" size="sm" className="gap-2" onClick={onCancel}>
              <StopCircle className="h-4 w-4" /> Stop All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Auto-fetch progress mode
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Auto-Fetching Results</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount} / {totalCount}
            </span>
          </DialogTitle>
          <DialogDescription>
            AI is automatically solving CAPTCHAs and fetching results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Progress value={progress} className="h-3" />

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
