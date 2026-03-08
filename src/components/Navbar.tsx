import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, LogIn, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#about", label: "About" },
    { href: "/#contact", label: "Contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-background"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            RGPV Analyzer
          </span>
            RGPV Analyzer
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
            >
              {l.label}
            </a>
          ))}

          <div className="w-px h-5 bg-border mx-2" />

          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className=""
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-background/95 backdrop-blur-xl border-t border-border px-4 py-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2.5 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-border my-1" />
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogIn className="h-3.5 w-3.5" /> Login
            </Button>
          </Link>
          <Link to="/register" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full gap-2">
              <UserPlus className="h-3.5 w-3.5" /> Register
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
