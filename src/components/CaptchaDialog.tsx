import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface CaptchaDialogProps {
  open: boolean;
  captchaImage: string | null;
  currentEnrollment: string;
  currentIndex: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  onRetry: () => void;
  onCancel: () => void;
  lastResult: { name: string; status: string } | null;
}

export function CaptchaDialog({
  open,
  captchaImage,
  currentEnrollment,
  currentIndex,
  totalCount,
  loading,
  error,
  onCancel,
  lastResult,
}: CaptchaDialogProps) {
  const progress = totalCount > 0 ? ((currentIndex) / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Auto-Fetching Results</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentIndex + 1} / {totalCount}
            </span>
          </DialogTitle>
          <DialogDescription>
            AI is solving CAPTCHAs automatically. Currently processing:{" "}
            <span className="font-mono font-semibold text-foreground">{currentEnrollment}</span>
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        {lastResult && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            lastResult.status === "PASS" || lastResult.status === "Pass"
              ? "bg-green-500/10 text-green-600"
              : "bg-red-500/10 text-red-600"
          }`}>
            {lastResult.status === "PASS" || lastResult.status === "Pass" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>Last: {lastResult.name} — {lastResult.status}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 py-4">
          {captchaImage && (
            <img
              src={captchaImage}
              alt="CAPTCHA being solved"
              className="border border-border rounded-lg max-h-20 bg-white opacity-60"
            />
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span>AI solving CAPTCHA & fetching result...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
