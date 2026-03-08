import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, LogIn, UserPlus, Home, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAdmin } = useAdminCheck();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[hsl(230,35%,10%,0.95)] backdrop-blur-xl border-b border-[hsl(230,20%,18%)] shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-[hsl(240,50%,55%,0.2)] group-hover:bg-[hsl(240,50%,55%,0.3)] flex items-center justify-center transition-colors duration-300">
            <BarChart3 className="h-5 w-5 text-[hsl(220,60%,65%)]" />
          </div>
          <span className="font-display text-lg font-bold text-white">
            RGPV Analyzer
          </span>
        </Link>

        {/* Center Home Icon */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-[hsl(240,50%,55%,0.15)] hover:bg-[hsl(240,50%,55%,0.3)] border border-[hsl(240,50%,55%,0.25)] transition-all duration-300 group/home">
          <Home className="h-5 w-5 text-[hsl(220,60%,65%)] group-hover/home:text-white transition-colors" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {[
            { href: "/#features", label: "Features" },
            { href: "/#about", label: "About" },
            { href: "/#contact", label: "Contact" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-[hsl(240,50%,55%,0.1)] text-[hsl(230,20%,60%)] hover:text-white"
            >
              {l.label}
            </a>
          ))}

          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                <Shield className="h-3.5 w-3.5" /> Admin
              </Button>
            </Link>
          )}

          <div className="w-px h-5 bg-[hsl(230,20%,20%)] mx-2" />

          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-1.5 text-[hsl(230,20%,60%)] hover:text-white hover:bg-[hsl(240,50%,55%,0.1)]">
              <LogIn className="h-3.5 w-3.5" /> Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="gap-1.5 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white">
              <UserPlus className="h-3.5 w-3.5" /> Register
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-white hover:bg-[hsl(240,50%,55%,0.1)]">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-[hsl(230,35%,10%,0.98)] backdrop-blur-xl border-t border-[hsl(230,20%,18%)] px-4 py-4 flex flex-col gap-1">
          {[
            { href: "/#features", label: "Features" },
            { href: "/#about", label: "About" },
            { href: "/#contact", label: "Contact" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[hsl(230,20%,60%)] hover:text-white hover:bg-[hsl(240,50%,55%,0.1)] px-3 py-2.5 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-[hsl(230,20%,18%)] my-1" />
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-amber-400 hover:text-amber-300">
                <Shield className="h-3.5 w-3.5" /> Admin Panel
              </Button>
            </Link>
          )}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-[hsl(230,20%,60%)] hover:text-white">
              <LogIn className="h-3.5 w-3.5" /> Login
            </Button>
          </Link>
          <Link to="/register" onClick={() => setMobileOpen(false)}>
            <Button size="sm" className="w-full gap-2 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white">
              <UserPlus className="h-3.5 w-3.5" /> Register
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
