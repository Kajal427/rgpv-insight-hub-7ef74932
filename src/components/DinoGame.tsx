import { useRef, useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bird } from "lucide-react";

const W = 580;
const H = 180;
const GY = 150;
const DW = 28;
const DH = 36;
const GRAVITY = 0.55;
const JUMP_VEL = -10.5;

type Obstacle = { x: number; h: number };

type GameState = {
  y: number;
  vy: number;
  jumping: boolean;
  obs: Obstacle[];
  speed: number;
  score: number;
  over: boolean;
  started: boolean;
  spawnTimer: number;
};

const initialState = (): GameState => ({
  y: GY - DH,
  vy: 0,
  jumping: false,
  obs: [],
  speed: 3.5,
  score: 0,
  over: false,
  started: false,
  spawnTimer: 0,
});

export function DinoGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<GameState>(initialState());

  const reset = useCallback(() => {
    stateRef.current = initialState();
  }, []);

  const doJump = useCallback(() => {
    const s = stateRef.current;

    if (s.over) {
      stateRef.current = {
        ...initialState(),
        started: true,
        jumping: true,
        vy: JUMP_VEL,
      };
      return;
    }

    if (!s.started) s.started = true;
    if (!s.jumping) {
      s.vy = JUMP_VEL;
      s.jumping = true;
    }
  }, []);

  useEffect(() => {
    if (!open || !canvasEl) return;

    reset();

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    canvasEl.width = W;
    canvasEl.height = H;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        doJump();
      }
    };

    window.addEventListener("keydown", onKey);
    let mounted = true;

    const isDark = () => document.documentElement.classList.contains("dark");

    const draw = () => {
      if (!mounted) return;

      const s = stateRef.current;
      const dark = isDark();

      ctx.clearRect(0, 0, W, H);

      // background
      ctx.fillStyle = dark ? "#0f172a" : "#f0f9ff";
      ctx.fillRect(0, 0, W, H);

      // ground
      ctx.strokeStyle = dark ? "#475569" : "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GY);
      ctx.lineTo(W, GY);
      ctx.stroke();

      ctx.fillStyle = dark ? "#334155" : "#cbd5e1";
      for (let i = 0; i < W; i += 20) {
        ctx.fillRect(i, GY + 5, 2, 2);
      }

      if (!s.started) {
        ctx.fillStyle = dark ? "#94a3b8" : "#475569";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("🐦 Press SPACE or TAP to play!", W / 2, H / 2);
      } else {
        // physics
        s.vy += GRAVITY;
        s.y += s.vy;
        if (s.y >= GY - DH) {
          s.y = GY - DH;
          s.vy = 0;
          s.jumping = false;
        }

        // bird
        const bx = 50;
        const by = s.y;

        ctx.fillStyle = dark ? "#38bdf8" : "#0ea5e9";
        ctx.beginPath();
        ctx.ellipse(bx + DW / 2, by + DH / 2, DW / 2, DH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark ? "#fbbf24" : "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(bx + DW, by + DH * 0.35);
        ctx.lineTo(bx + DW + 10, by + DH * 0.45);
        ctx.lineTo(bx + DW, by + DH * 0.55);
        ctx.fill();

        ctx.fillStyle = dark ? "#0f172a" : "#fff";
        ctx.beginPath();
        ctx.arc(bx + DW * 0.65, by + DH * 0.35, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark ? "#e2e8f0" : "#1e293b";
        ctx.beginPath();
        ctx.arc(bx + DW * 0.7, by + DH * 0.33, 2, 0, Math.PI * 2);
        ctx.fill();

        const wingFlap = Math.sin(Date.now() / 80) * 5;
        ctx.fillStyle = dark ? "#7dd3fc" : "#38bdf8";
        ctx.beginPath();
        ctx.ellipse(bx + 4, by + DH * 0.5 + wingFlap, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // obstacles
        if (!s.over) {
          s.speed += 0.001;
          s.spawnTimer += s.speed;

          if (s.spawnTimer > 110 + Math.random() * 60) {
            s.obs.push({ x: W + 10, h: 22 + Math.random() * 35 });
            s.spawnTimer = 0;
          }

          for (let i = s.obs.length - 1; i >= 0; i--) {
            s.obs[i].x -= s.speed;
            if (s.obs[i].x + 14 < 0) s.obs.splice(i, 1);
          }

          s.score += 0.15;
        }

        // draw obstacles + collision
        for (let i = s.obs.length - 1; i >= 0; i--) {
          const o = s.obs[i];
          const cw = 14;

          ctx.fillStyle = dark ? "#4ade80" : "#16a34a";
          ctx.fillRect(o.x, GY - o.h, cw, o.h);
          ctx.fillRect(o.x - 5, GY - o.h * 0.7, 6, 4);
          ctx.fillRect(o.x + cw - 1, GY - o.h * 0.5, 6, 4);

          if (!s.over && 50 + DW > o.x + 2 && 50 < o.x + cw - 2 && s.y + DH > GY - o.h) {
            s.over = true;
          }
        }

        // score + clouds
        ctx.fillStyle = dark ? "#e2e8f0" : "#1e293b";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Score: ${Math.floor(s.score)}`, W - 12, 22);

        ctx.fillStyle = dark ? "#1e293b" : "#e0f2fe";
        ctx.beginPath();
        ctx.ellipse(100, 30, 25, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(350, 45, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (s.over) {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = dark ? "#f87171" : "#ef4444";
          ctx.font = "bold 24px monospace";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", W / 2, H / 2 - 8);
          ctx.font = "13px monospace";
          ctx.fillStyle = dark ? "#94a3b8" : "#e2e8f0";
          ctx.fillText(`Score: ${Math.floor(s.score)} — Tap to retry`, W / 2, H / 2 + 18);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      mounted = false;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, [open, canvasEl, doJump, reset]);

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
          ref={setCanvasEl}
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
