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
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

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
  onSubmit,
  onSkip,
  onRetry,
  onCancel,
  lastResult,
}: CaptchaDialogProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && captchaImage && !loading) {
      setAnswer("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, captchaImage, loading, currentEnrollment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) onSubmit(answer.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Solve CAPTCHA</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentIndex + 1} / {totalCount}
            </span>
          </DialogTitle>
          <DialogDescription>
            Fetching result for: <span className="font-mono font-semibold text-foreground">{currentEnrollment}</span>
          </DialogDescription>
        </DialogHeader>

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

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {captchaImage ? "Submitting..." : "Loading CAPTCHA..."}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-destructive text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        ) : captchaImage ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <img
                src={captchaImage}
                alt="CAPTCHA"
                className="border border-border rounded-lg max-h-24 bg-white"
              />
            </div>
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type the characters shown above"
              className="text-center text-lg font-mono tracking-widest"
              autoComplete="off"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-1">
                <RefreshCw className="h-3 w-3" /> New CAPTCHA
              </Button>
              <Button type="submit" size="sm" disabled={!answer.trim()}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
