import { GraduationCap, Target, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-[hsl(228,35%,8%)] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[hsl(240,50%,20%)] rounded-full opacity-10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[hsl(174,60%,20%)] rounded-full opacity-10 blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6 text-white">
              About <span className="text-[hsl(220,60%,65%)]">RGPV Analyzer</span>
            </h2>
            <p className="text-[hsl(230,15%,55%)] leading-relaxed mb-6">
              RGPV Analyzer is an advanced exam analysis platform designed for faculty members of Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV). The tool simplifies the complex process of result evaluation by allowing faculty to upload result data directly from the official RGPV website in CSV format.
            </p>
            <p className="text-[hsl(230,15%,55%)] leading-relaxed mb-6">
              Once the CSV file is uploaded, the system automatically processes the data, generates detailed results, and performs comprehensive analysis. It transforms raw examination data into meaningful insights through interactive graphs, performance statistics, and predictive analytics.
            </p>
            <p className="text-[hsl(230,15%,55%)] leading-relaxed">
              The platform helps educators quickly understand student performance trends, identify strengths and weaknesses in different subjects, and make data-driven decisions to improve academic outcomes.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              { icon: GraduationCap, title: "Built for RGPV", desc: "The tool is specially designed to support RGPV's result format and grading system, ensuring accurate and reliable analysis for faculty members." },
              { icon: Target, title: "Data-Driven Analytics", desc: "The platform converts raw data into clear visual insights using charts and graphs such as subject-wise performance, pass percentage, and comparative analysis." },
              { icon: Lightbulb, title: "Predictive Intelligence", desc: "By analyzing historical results, the system can help predict future performance trends and highlight areas where students may need additional academic support." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] hover:border-[hsl(240,50%,45%,0.3)] transition-colors duration-300">
                <div className="h-10 w-10 rounded-lg bg-[hsl(240,50%,55%,0.15)] flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-[hsl(220,60%,65%)]" />
                </div>
                <div>
                  <h3 className="font-display font-semibold mb-1 text-white">{item.title}</h3>
                  <p className="text-sm text-[hsl(230,15%,55%)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
