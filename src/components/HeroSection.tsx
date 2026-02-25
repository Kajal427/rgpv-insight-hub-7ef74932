import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, TrendingUp } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient opacity-90" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6 animate-fade-in">
            <TrendingUp className="h-4 w-4" />
            <span>Smart Exam Analytics for RGPV</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6 animate-fade-in-up">
            Analyze & Predict
            <br />
            <span className="text-gradient">RGPV Results</span>
            <br />
            with Precision
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-xl mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Upload student data, fetch results from RGPV portal, and get powerful analytics with result prediction — all in one platform built for faculty.
          </p>
          <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                Explore Features
              </Button>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
