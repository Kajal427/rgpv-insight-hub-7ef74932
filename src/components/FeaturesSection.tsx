import { Upload, BarChart3, Brain, Globe, ShieldCheck, Users } from "lucide-react";

const features = [
  { icon: Upload, title: "CSV Upload", description: "Bulk upload student enrollment data via CSV files for instant processing." },
  { icon: Globe, title: "Live Result Fetch", description: "Automatically fetch results from result.rgpv.com portal in real-time." },
  { icon: BarChart3, title: "Deep Analytics", description: "Subject-wise, branch-wise analysis with charts, graphs and detailed breakdowns." },
  { icon: Brain, title: "Result Prediction", description: "AI-powered prediction models to forecast student performance trends." },
  { icon: ShieldCheck, title: "Secure Access", description: "Faculty-only access with email-verified OTP registration system." },
  { icon: Users, title: "Faculty Dashboard", description: "Personal dashboard to manage uploads, view history and track analysis." },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Powerful Features</h2>
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
