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
              RGPV Analyzer is an advanced exam analysis platform designed for faculty members of Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV). The tool simplifies the complex process of result evaluation by allowing faculty to upload result data directly from the official RGPV website in CSV format.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Once the CSV file is uploaded, the system automatically processes the data, generates detailed results, and performs comprehensive analysis. It transforms raw examination data into meaningful insights through interactive graphs, performance statistics, and predictive analytics.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The platform helps educators quickly understand student performance trends, identify strengths and weaknesses in different subjects, and make data-driven decisions to improve academic outcomes.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: GraduationCap, title: "Built for RGPV", desc: "The tool is specially designed to support RGPV's result format and grading system, ensuring accurate and reliable analysis for faculty members." },
              { icon: Target, title: "Data-Driven Analytics", desc: "The platform converts raw data into clear visual insights using charts and graphs such as subject-wise performance, pass percentage, and comparative analysis." },
              { icon: Lightbulb, title: "Predictive Intelligence", desc: "By analyzing historical results, the system can help predict future performance trends and highlight areas where students may need additional academic support." },
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