import { supabase } from "@/integrations/supabase/client";

type SubjectGrade = { code: string; grade: string };

export type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: SubjectGrade[];
};

type SessionData = {
  cookies: string;
  formFields: Record<string, string>;
  resultPageUrl: string;
};

export type ManualCaptchaRequest = {
  enrollment: string;
  captchaImage: string;
  sessionData: SessionData;
};

export type QueueState = {
  /** Is the worker currently processing? */
  running: boolean;
  /** All enrollments in the queue */
  enrollments: string[];
  /** Results fetched so far */
  results: StudentResult[];
  /** Index of the enrollment currently being processed */
  currentIndex: number;
  /** Number completed (success or fail) */
  completedCount: number;
  /** Last successful result info */
  lastResult: { name: string; status: string } | null;
  /** Current transient error message */
  error: string | null;
  /** If set, the worker is paused waiting for manual CAPTCHA input */
  manualCaptcha: ManualCaptchaRequest | null;
  /** Config */
  program: string;
  semester: string;
};

type Listener = (state: QueueState) => void;

class FetchQueue {
  private state: QueueState = {
    running: false,
    enrollments: [],
    results: [],
    currentIndex: 0,
    completedCount: 0,
    lastResult: null,
    error: null,
    manualCaptcha: null,
    program: "B.Tech.",
    semester: "1",
  };

  private listeners = new Set<Listener>();
  private aborted = false;
  private sessionData: SessionData | null = null;
  private captchaImage: string | null = null;
  private manualResolve: ((v: { action: "submit"; text: string } | { action: "skip" }) => void) | null = null;

  getState(): QueueState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = { ...this.state };
    this.listeners.forEach((l) => l(snapshot));
  }

  private patch(partial: Partial<QueueState>) {
    Object.assign(this.state, partial);
    this.emit();
  }

  /** Enqueue enrollments and start processing. If already running, does nothing. */
  start(enrollments: string[], program: string, semester: string, existingResults: StudentResult[] = []) {
    if (this.state.running) return;
    this.aborted = false;
    this.sessionData = null;
    this.captchaImage = null;
    this.manualResolve = null;

    this.state = {
      running: true,
      enrollments,
      results: [...existingResults],
      currentIndex: 0,
      completedCount: 0,
      lastResult: null,
      error: null,
      manualCaptcha: null,
      program,
      semester,
    };
    this.emit();
    this.processQueue();
  }

  /** Stop the worker. In-flight request will finish but no more will start. */
  stop() {
    this.aborted = true;
    // Resolve any pending manual captcha
    this.manualResolve?.({ action: "skip" });
    this.manualResolve = null;
    this.patch({ running: false, manualCaptcha: null });
  }

  /** Submit a manual CAPTCHA answer */
  submitManualCaptcha(text: string) {
    this.manualResolve?.({ action: "submit", text });
    this.manualResolve = null;
    this.patch({ manualCaptcha: null });
  }

  /** Skip manual CAPTCHA for current enrollment */
  skipManualCaptcha() {
    this.manualResolve?.({ action: "skip" });
    this.manualResolve = null;
    this.patch({ manualCaptcha: null });
  }

  private async processQueue() {
    const { enrollments, program, semester } = this.state;
    const fetched = this.state.results;

    for (let i = 0; i < enrollments.length; i++) {
      if (this.aborted) break;
      this.patch({ currentIndex: i, error: null });

      const enrollment = enrollments[i];
      // Skip already successful
      if (fetched.find((f) => f.enrollment === enrollment && f.name !== "Fetch Failed" && f.status !== "Error")) {
        this.patch({ completedCount: i + 1 });
        continue;
      }

      const MAX_RETRIES = 5;
      let succeeded = false;
      let finalError = "Failed";
      let lastManualFallback: { captchaImage: string; sessionData: any } | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (this.aborted) break;

        try {
          const { data, error } = await supabase.functions.invoke("fetch-rgpv-results", {
            body: {
              action: "auto-fetch",
              enrollment,
              semester,
              program,
              sessionData: this.sessionData,
              captchaImage: this.captchaImage,
            },
          });

          if (!error && data?.success) {
            const result = data.result as StudentResult;
            this.upsertResult(fetched, enrollment, result);
            this.patch({ lastResult: { name: result.name, status: result.status } });
            succeeded = true;

            if (data.nextSession) {
              this.sessionData = data.nextSession.sessionData;
              this.captchaImage = data.nextSession.captchaImage;
            } else {
              this.sessionData = null;
              this.captchaImage = null;
            }
            break;
          }

          if (data?.manualFallback) {
            lastManualFallback = data.manualFallback;
          }

          const errMsg = data?.error || error?.message || "Failed";
          finalError = errMsg;
          const isRateLimited = /rate limited/i.test(errMsg);
          const isTransient = isRateLimited || /timed out|unreachable|aborted|connection/i.test(errMsg);

          if (isTransient && attempt < MAX_RETRIES - 1) {
            const waitMs = isRateLimited ? 10000 : 3000;
            this.patch({ error: `${enrollment}: ${isRateLimited ? "AI is busy" : errMsg}. Retrying in ${Math.ceil(waitMs / 1000)}s...` });
            this.sessionData = null;
            this.captchaImage = null;
            await this.wait(waitMs);
            continue;
          }
          break;
        } catch (err: any) {
          const errMsg = err?.message || "Failed";
          finalError = errMsg;
          const isTransient = /timed out|unreachable|aborted|connection|rate limited/i.test(errMsg);

          if (isTransient && attempt < MAX_RETRIES - 1) {
            this.patch({ error: `${enrollment}: Temporary issue. Retrying in 3s...` });
            this.sessionData = null;
            this.captchaImage = null;
            await this.wait(3000);
            continue;
          }
          break;
        }
      }

      if (!succeeded && !this.aborted) {
        let manualFallbackUsed = false;

        if (lastManualFallback) {
          try {
            const manualResult = await new Promise<{ action: "submit"; text: string } | { action: "skip" }>((resolve) => {
              this.manualResolve = resolve;
              this.patch({
                manualCaptcha: {
                  enrollment,
                  captchaImage: lastManualFallback!.captchaImage,
                  sessionData: lastManualFallback!.sessionData,
                },
              });
            });

            if (manualResult.action === "submit") {
              const { data: submitData } = await supabase.functions.invoke("fetch-rgpv-results", {
                body: {
                  action: "submit",
                  enrollment,
                  semester,
                  captchaAnswer: manualResult.text,
                  sessionData: lastManualFallback.sessionData,
                },
              });

              if (submitData?.success && submitData?.result) {
                const result = submitData.result as StudentResult;
                this.upsertResult(fetched, enrollment, result);
                this.patch({ lastResult: { name: result.name, status: result.status } });
                manualFallbackUsed = true;

                if (submitData.nextSession) {
                  this.sessionData = submitData.nextSession.sessionData;
                  this.captchaImage = submitData.nextSession.captchaImage;
                } else {
                  this.sessionData = null;
                  this.captchaImage = null;
                }
              }
            }
          } catch {
            // manual fallback failed
          }
        }

        if (!manualFallbackUsed) {
          const failedEntry: StudentResult = { enrollment, name: "Fetch Failed", sgpa: "N/A", cgpa: "N/A", status: "Error", subjects: [] };
          this.upsertResult(fetched, enrollment, failedEntry);
          this.patch({ error: `${enrollment}: ${finalError}` });
          this.sessionData = null;
          this.captchaImage = null;
        }
      }

      // Update results + persist
      this.patch({ results: [...fetched], completedCount: i + 1 });
      localStorage.setItem("rgpv_results", JSON.stringify(fetched));
      localStorage.setItem("rgpv_meta", JSON.stringify({ program, semester, fetchedAt: new Date().toISOString() }));

      // Small delay between students
      if (i < enrollments.length - 1 && !this.aborted) {
        await this.wait(500);
      }
    }

    this.patch({ running: false, manualCaptcha: null });
  }

  private upsertResult(arr: StudentResult[], enrollment: string, result: StudentResult) {
    const idx = arr.findIndex((f) => f.enrollment === enrollment);
    if (idx >= 0) arr[idx] = result;
    else arr.push(result);
  }

  private wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }
}

// Singleton instance — survives component unmounts
export const fetchQueue = new FetchQueue();
