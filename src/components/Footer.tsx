import { BarChart3 } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border py-8 bg-card">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <span className="font-display font-semibold text-foreground">RGPV Analyzer</span>
      </div>
      <p className="text-sm text-muted-foreground">© 2026 RGPV Analyzer. All rights reserved.</p>
    </div>
  </footer>
);
