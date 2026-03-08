import { useState } from "react";
import { BarChart3, Bird } from "lucide-react";
import { DinoGame } from "@/components/DinoGame";

export const Footer = () => {
  const [gameOpen, setGameOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border py-8 bg-card">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">RGPV Analyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setGameOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors group"
              title="Play Bird Runner 🐦"
            >
              <Bird className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            <p className="text-sm text-muted-foreground">© 2026 RGPV Analyzer. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <DinoGame open={gameOpen} onClose={() => setGameOpen(false)} />
    </>
  );
};
