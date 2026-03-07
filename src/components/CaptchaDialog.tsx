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
import { Loader2, CheckCircle2, XCircle, StopCircle } from "lucide-react";

interface CaptchaDialogProps {
  open: boolean;
  currentEnrollment: string;
  currentIndex: number;
  totalCount: number;
  error: string | null;
  onCancel: () => void;
  lastResult: { name: string; status: string } | null;
  completedCount: number;
}

export function CaptchaDialog({
  open,
  currentEnrollment,
  totalCount,
  error,
  onCancel,
  lastResult,
  completedCount,
}: CaptchaDialogProps) {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
