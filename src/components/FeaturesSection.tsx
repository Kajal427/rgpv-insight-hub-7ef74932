import { Upload, BarChart3, Brain, PieChart, FileSpreadsheet, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const features = [
  { icon: FileSpreadsheet, title: "Automated Processing", description: "Upload CSV from RGPV website — get structured results instantly, no manual work." },
  { icon: BarChart3, title: "Data-Driven Analytics", description: "Subject-wise performance, pass percentage & comparative analysis through visual charts." },
  { icon: PieChart, title: "Visual Analysis", description: "Bar charts, pie charts, radar charts & trend graphs for clear performance insights." },
  { icon: Brain, title: "Predictive Intelligence", description: "Predict future trends and identify students needing additional academic support." },
  { icon: Upload, title: "Built for RGPV", description: "Designed specifically for RGPV's result format and grading system." },
  { icon: Shield, title: "Secure & Reliable", description: "Your data stays protected with secure processing and reliable cloud infrastructure." },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative bg-[hsl(230,30%,14%)] rounded-2xl p-6 border border-[hsl(230,20%,20%)] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_hsl(240,50%,40%,0.2)] hover:border-[hsl(240,50%,45%,0.4)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,50%,50%,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="h-12 w-12 rounded-xl bg-[hsl(240,50%,55%,0.15)] flex items-center justify-center mb-4 group-hover:bg-[hsl(240,50%,55%,0.25)] group-hover:scale-110 transition-all duration-300">
          <feature.icon className="h-5 w-5 text-[hsl(220,60%,65%)]" />
        </div>
        <h3 className="font-display text-base font-semibold mb-1.5 text-white">{feature.title}</h3>
        <p className="text-sm text-[hsl(230,15%,55%)] leading-relaxed">{feature.description}</p>
      </div>
    </div>
  );
};

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-[hsl(230,35%,10%)] relative">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(240,40%,15%)_0%,transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(220,60%,65%)] mb-3">What We Offer</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">Key Features</h2>
          <p className="text-[hsl(230,15%,55%)] max-w-md mx-auto text-sm">
            Everything you need to analyze RGPV results and predict student outcomes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
