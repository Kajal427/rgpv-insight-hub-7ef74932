import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, LogIn, UserPlus, Home, Shield, LayoutDashboard, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isLoggedIn = !!session && !sessionLoading;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-primary/20 group-hover:bg-primary/30 flex items-center justify-center transition-colors duration-300">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            RGPV Analyzer
          </span>
        </Link>

        {/* Center Home Icon */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 -ml-16 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-300 group/home">
          <Home className="h-5 w-5 text-primary group-hover/home:text-foreground transition-colors" />
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
              className="relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}

          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 text-warning hover:text-warning hover:bg-warning/10">
                <Shield className="h-3.5 w-3.5" /> Admin
              </Button>
            </Link>
          )}

          <div className="w-px h-5 bg-border mx-2" />

          {isLoggedIn ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <LogIn className="h-3.5 w-3.5" /> Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Register
                </Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground hover:bg-muted">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-background/98 backdrop-blur-xl border-t border-border px-4 py-4 flex flex-col gap-1">
          {[
            { href: "/#features", label: "Features" },
            { href: "/#about", label: "About" },
            { href: "/#contact", label: "Contact" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-2.5 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-border my-1" />
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-warning hover:text-warning">
                <Shield className="h-3.5 w-3.5" /> Admin Panel
              </Button>
            </Link>
          )}
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary hover:text-primary">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                <LogOut className="h-3.5 w-3.5" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                  <LogIn className="h-3.5 w-3.5" /> Login
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full gap-2">
                  <UserPlus className="h-3.5 w-3.5" /> Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
