import { BarChart3, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Features", href: "/#features" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">RGPV Analyzer</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>© 2026 RGPV Analyzer. Made with</span>
          <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" />
        </div>
      </div>
    </div>
  </footer>
);
