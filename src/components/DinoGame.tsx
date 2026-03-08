import { useRef, useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Bird } from "lucide-react";

const CANVAS_W = 600;
const CANVAS_H = 200;
const GROUND_Y = 160;
const DINO_W = 30;
const DINO_H = 40;
const GRAVITY = 0.6;
const JUMP_VEL = -11;
const OBS_W = 18;
const OBS_MIN_H = 25;
const OBS_MAX_H = 55;
const INIT_SPEED = 4;
const SPEED_INC = 0.002;

type Obstacle = { x: number; h: number };

export function DinoGame({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const gameRef = useRef({
    dinoY: GROUND_Y - DINO_H,
    velY: 0,
    jumping: false,
    obstacles: [] as Obstacle[],
    speed: INIT_SPEED,
    score: 0,
    gameOver: false,
    started: false,
  });

  const reset = useCallback(() => {
    const g = gameRef.current;
    g.dinoY = GROUND_Y - DINO_H;
    g.velY = 0;
    g.jumping = false;
    g.obstacles = [];
    g.speed = INIT_SPEED;
    g.score = 0;
    g.gameOver = false;
    g.started = false;
  }, []);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.gameOver) {
      reset();
      return;
    }
    if (!g.started) g.started = true;
    if (!g.jumping) {
      g.velY = JUMP_VEL;
      g.jumping = true;
    }
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    reset();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", handleKey);

    let lastObsSpawn = 0;

    const loop = () => {
      const g = gameRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Sky
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#1a1a2e" : "#f0f9ff";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground
      ctx.fillStyle = isDark ? "#334155" : "#a3a3a3";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);

      if (!g.started) {
        ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Press SPACE or TAP to start", CANVAS_W / 2, CANVAS_H / 2);
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Update dino
      g.velY += GRAVITY;
      g.dinoY += g.velY;
      if (g.dinoY >= GROUND_Y - DINO_H) {
        g.dinoY = GROUND_Y - DINO_H;
        g.velY = 0;
        g.jumping = false;
      }

      // Draw dino (simple bird shape)
      ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
      ctx.fillRect(50, g.dinoY, DINO_W, DINO_H);
      // eye
      ctx.fillStyle = isDark ? "#1a1a2e" : "#f0f9ff";
      ctx.fillRect(68, g.dinoY + 6, 5, 5);
      // wing
      ctx.fillStyle = isDark ? "#7dd3fc" : "#38bdf8";
      ctx.fillRect(50, g.dinoY + 12, 10, 8);

      // Spawn obstacles
      g.speed += SPEED_INC;
      lastObsSpawn += g.speed;
      if (lastObsSpawn > 120 + Math.random() * 80) {
        g.obstacles.push({ x: CANVAS_W, h: OBS_MIN_H + Math.random() * (OBS_MAX_H - OBS_MIN_H) });
        lastObsSpawn = 0;
      }

      // Update & draw obstacles
      ctx.fillStyle = isDark ? "#f87171" : "#dc2626";
      for (let i = g.obstacles.length - 1; i >= 0; i--) {
        g.obstacles[i].x -= g.speed;
        const obs = g.obstacles[i];
        ctx.fillRect(obs.x, GROUND_Y - obs.h, OBS_W, obs.h);
        // Collision
        if (
          50 + DINO_W > obs.x &&
          50 < obs.x + OBS_W &&
          g.dinoY + DINO_H > GROUND_Y - obs.h
        ) {
          g.gameOver = true;
        }
        if (obs.x + OBS_W < 0) g.obstacles.splice(i, 1);
      }

      // Score
      g.score += 0.1;
      ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`Score: ${Math.floor(g.score)}`, CANVAS_W - 10, 25);

      if (g.gameOver) {
        ctx.fillStyle = isDark ? "#f87171" : "#dc2626";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.font = "14px monospace";
        ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
        ctx.fillText("Tap or press SPACE to restart", CANVAS_W / 2, CANVAS_H / 2 + 15);
      } else {
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKey);
      cancelAnimationFrame(frameRef.current);
    };
  }, [open, jump, reset]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[650px] p-4 gap-2" aria-describedby="dino-game-desc">
        <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bird className="h-4 w-4 text-primary" /> Bird Runner
        </DialogTitle>
        <VisuallyHidden>
          <DialogDescription id="dino-game-desc">A simple bird runner game. Press space or tap to jump over obstacles.</DialogDescription>
        </VisuallyHidden>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
          className="rounded-lg border border-border cursor-pointer block mx-auto"
          onClick={jump}
        />
        <p className="text-[10px] text-muted-foreground text-center">SPACE / TAP to jump</p>
      </DialogContent>
    </Dialog>
  );
}
