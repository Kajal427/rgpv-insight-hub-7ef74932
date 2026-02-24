import { GraduationCap, Target, Lightbulb } from "lucide-react";

export const AboutSection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
              About <span className="text-primary">RGPV Analyzer</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              RGPV Analyzer is a comprehensive exam analysis tool designed specifically for Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV) faculty members. Our platform simplifies result analysis by automating data collection, visualization, and prediction.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Built by educators for educators, we aim to provide actionable insights that help improve student performance and academic outcomes across all departments.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: GraduationCap, title: "Built for RGPV", desc: "Tailored specifically for RGPV's grading system and result format." },
              { icon: Target, title: "Data-Driven Insights", desc: "Transform raw results into meaningful analytics and trends." },
              { icon: Lightbulb, title: "Predictive Intelligence", desc: "Leverage historical data to forecast future performance." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
