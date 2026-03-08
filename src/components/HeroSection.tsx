import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, TrendingUp, FileSpreadsheet } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { icon: Users, label: "Faculty Users", value: "500+" },
  { icon: FileSpreadsheet, label: "Results Analyzed", value: "50K+" },
  { icon: TrendingUp, label: "Accuracy Rate", value: "99.2%" },
];

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient opacity-90" />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 left-10 w-56 h-56 bg-info/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />

      <div className="container relative z-10 mx-auto px-4 py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 backdrop-blur-sm px-4 py-1.5 text-sm text-primary-foreground/80 mb-6 animate-fade-in">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Powered by AI Analytics</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.1] mb-6 animate-fade-in-up">
            <span className="text-gradient">RGPV Insight:</span>
            <br />
            Result Analysis &
            <br />
            Prediction Tool
          </h1>
          <p className="text-lg text-primary-foreground/60 max-w-xl mb-10 animate-fade-in-up leading-relaxed" style={{ animationDelay: "0.2s" }}>
            Upload student data, fetch results from RGPV portal, and get powerful analytics with AI-powered result prediction — built for faculty.
          </p>
          <div className="flex flex-wrap gap-4 mb-14 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Link to="/register">
              <Button size="lg" className="gap-2 px-8 h-12 text-base shadow-lg shadow-primary/25">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent h-12 px-8 text-base">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold font-display text-primary-foreground">{s.value}</p>
                  <p className="text-xs text-primary-foreground/50">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
