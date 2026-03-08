import { BarChart3 } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-[hsl(230,20%,15%)] py-8 bg-[hsl(228,35%,7%)]">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[hsl(220,60%,65%)]" />
        <span className="font-display font-semibold text-white">RGPV Analyzer</span>
      </div>
      <p className="text-sm text-[hsl(230,15%,45%)]">© 2026 RGPV Analyzer. All rights reserved.</p>
    </div>
  </footer>
);
