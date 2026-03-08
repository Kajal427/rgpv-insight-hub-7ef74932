import { GraduationCap, Target, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const items = [
  { icon: GraduationCap, title: "Built for RGPV", desc: "Specially designed for RGPV's result format and grading system, ensuring accurate analysis for faculty." },
  { icon: Target, title: "Data-Driven Analytics", desc: "Raw data transformed into visual insights — subject-wise performance, pass percentage & comparative analysis." },
  { icon: Lightbulb, title: "Predictive Intelligence", desc: "Predict future performance trends and highlight students needing additional academic support." },
];

export const AboutSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-24 relative overflow-hidden" ref={ref}>
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-3">About Us</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6 text-foreground">
              About <span className="text-gradient">RGPV Analyzer</span>
            </h2>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                RGPV Analyzer is an advanced exam analysis platform designed for faculty members of Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV). The tool simplifies result evaluation by allowing faculty to upload result data directly from the official RGPV website in CSV format.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The system automatically processes data, generates detailed results, and performs comprehensive analysis — transforming raw examination data into meaningful insights through interactive graphs, statistics, and predictive analytics.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Helping educators understand student performance trends, identify strengths and weaknesses, and make data-driven decisions to improve academic outcomes.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
            {items.map((item, i) => (
              <div
                key={item.title}
                className={`group flex gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-500 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${300 + i * 100}ms` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors duration-300">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1 text-card-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
