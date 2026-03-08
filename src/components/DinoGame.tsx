import { useRef, useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bird } from "lucide-react";

const W = 580;
const H = 180;
const GY = 150; // ground Y
const DW = 28;
const DH = 36;
const G = 0.55;
const JV = -10.5;

export function DinoGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    y: GY - DH, vy: 0, jumping: false,
    obs: [] as { x: number; h: number }[],
    spd: 3.5, score: 0, over: false, started: false, spawnTimer: 0,
  });

  const reset = useCallback(() => {
    const s = stateRef.current;
    s.y = GY - DH; s.vy = 0; s.jumping = false;
    s.obs = []; s.spd = 3.5; s.score = 0;
    s.over = false; s.started = false; s.spawnTimer = 0;
  }, []);

  const doJump = useCallback(() => {
    const s = stateRef.current;
    if (s.over) { reset(); return; }
    if (!s.started) s.started = true;
    if (!s.jumping) { s.vy = JV; s.jumping = true; }
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    reset();

    // small delay to let dialog mount
    const initTimer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const onKey = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); doJump(); }
      };
      window.addEventListener("keydown", onKey);

      const dark = () => document.documentElement.classList.contains("dark");

      const draw = () => {
        const s = stateRef.current;
        const d = dark();

        // background
        ctx.fillStyle = d ? "#0f172a" : "#f0f9ff";
        ctx.fillRect(0, 0, W, H);

        // ground
        ctx.strokeStyle = d ? "#475569" : "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GY);
        ctx.lineTo(W, GY);
        ctx.stroke();

        // ground dots
        ctx.fillStyle = d ? "#334155" : "#cbd5e1";
        for (let i = 0; i < W; i += 20) {
          ctx.fillRect(i, GY + 5, 2, 2);
        }

        if (!s.started) {
          ctx.fillStyle = d ? "#94a3b8" : "#475569";
          ctx.font = "bold 16px monospace";
          ctx.textAlign = "center";
          ctx.fillText("🐦 Press SPACE or TAP to play!", W / 2, H / 2);
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // physics
        s.vy += G;
        s.y += s.vy;
        if (s.y >= GY - DH) { s.y = GY - DH; s.vy = 0; s.jumping = false; }

        // bird body
        const bx = 50, by = s.y;
        ctx.fillStyle = d ? "#38bdf8" : "#0ea5e9";
        ctx.beginPath();
        ctx.ellipse(bx + DW / 2, by + DH / 2, DW / 2, DH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // beak
        ctx.fillStyle = d ? "#fbbf24" : "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(bx + DW, by + DH * 0.35);
        ctx.lineTo(bx + DW + 10, by + DH * 0.45);
        ctx.lineTo(bx + DW, by + DH * 0.55);
        ctx.fill();

        // eye
        ctx.fillStyle = d ? "#0f172a" : "#fff";
        ctx.beginPath();
        ctx.arc(bx + DW * 0.65, by + DH * 0.35, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = d ? "#e2e8f0" : "#1e293b";
        ctx.beginPath();
        ctx.arc(bx + DW * 0.7, by + DH * 0.33, 2, 0, Math.PI * 2);
        ctx.fill();

        // wing
        ctx.fillStyle = d ? "#7dd3fc" : "#38bdf8";
        ctx.beginPath();
        const wingFlap = Math.sin(Date.now() / 80) * 5;
        ctx.ellipse(bx + 4, by + DH * 0.5 + wingFlap, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // obstacles (cacti)
        s.spd += 0.001;
        s.spawnTimer += s.spd;
        if (s.spawnTimer > 110 + Math.random() * 60) {
          s.obs.push({ x: W + 10, h: 22 + Math.random() * 35 });
          s.spawnTimer = 0;
        }

        for (let i = s.obs.length - 1; i >= 0; i--) {
          s.obs[i].x -= s.spd;
          const o = s.obs[i];

          // cactus
          ctx.fillStyle = d ? "#4ade80" : "#16a34a";
          const cw = 14;
          ctx.fillRect(o.x, GY - o.h, cw, o.h);
          // cactus arms
          ctx.fillRect(o.x - 5, GY - o.h * 0.7, 6, 4);
          ctx.fillRect(o.x + cw - 1, GY - o.h * 0.5, 6, 4);

          // collision
          if (bx + DW > o.x + 2 && bx < o.x + cw - 2 && by + DH > GY - o.h) {
            s.over = true;
          }
          if (o.x + cw < 0) s.obs.splice(i, 1);
        }

        // score
        s.score += 0.15;
        ctx.fillStyle = d ? "#e2e8f0" : "#1e293b";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Score: ${Math.floor(s.score)}`, W - 12, 22);

        // clouds
        ctx.fillStyle = d ? "#1e293b" : "#e0f2fe";
        ctx.beginPath();
        ctx.ellipse(100, 30, 25, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(350, 45, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (s.over) {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = d ? "#f87171" : "#ef4444";
          ctx.font = "bold 24px monospace";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", W / 2, H / 2 - 8);
          ctx.font = "13px monospace";
          ctx.fillStyle = d ? "#94a3b8" : "#e2e8f0";
          ctx.fillText(`Score: ${Math.floor(s.score)} — Tap to retry`, W / 2, H / 2 + 18);
        } else {
          rafRef.current = requestAnimationFrame(draw);
        }
      };

      rafRef.current = requestAnimationFrame(draw);

      return () => {
        window.removeEventListener("keydown", onKey);
        cancelAnimationFrame(rafRef.current);
      };
    }, 100);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [open, doJump, reset]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-4 gap-2" aria-describedby="dino-desc">
        <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bird className="h-4 w-4 text-primary" /> Bird Runner
        </DialogTitle>
        <DialogDescription id="dino-desc" className="sr-only">
          Jump over obstacles. Press space or tap to play.
        </DialogDescription>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: `${W}px`, height: `${H}px`, maxWidth: "100%" }}
          className="rounded-lg border border-border cursor-pointer block mx-auto bg-muted"
          onClick={doJump}
        />
        <p className="text-[10px] text-muted-foreground text-center">SPACE / TAP to jump 🐦</p>
      </DialogContent>
    </Dialog>
  );
}
