import { Upload, BarChart3, Brain, PieChart, FileSpreadsheet } from "lucide-react";

const features = [
  { icon: FileSpreadsheet, title: "Automated Result Processing", description: "Faculty can simply upload the CSV result file from the RGPV official website, and the system will automatically generate structured result data without manual calculations." },
  { icon: BarChart3, title: "Data-Driven Analytics", description: "The platform converts raw data into clear visual insights using charts and graphs such as subject-wise performance, pass percentage, and comparative analysis." },
  { icon: PieChart, title: "Visual Performance Analysis", description: "Student performance can be easily understood through different graphical representations like bar charts, pie charts, radar charts, and trend graphs." },
  { icon: Brain, title: "Predictive Intelligence", description: "By analyzing historical results, the system can help predict future performance trends and highlight areas where students may need additional academic support." },
  { icon: Upload, title: "Built for RGPV", description: "The tool is specially designed to support RGPV's result format and grading system, ensuring accurate and reliable analysis for faculty members." },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Key Features</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to analyze RGPV exam results and predict student outcomes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-card rounded-xl p-6 card-glow border border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};