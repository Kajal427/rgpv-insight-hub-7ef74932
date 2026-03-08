import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const FloatingShape = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
    transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
  />
);

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[hsl(230,35%,10%)]">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(250,40%,25%)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(174,72%,15%)_0%,transparent_50%)]" />

      {/* Floating 3D geometric shapes */}
      <FloatingShape
        className="absolute top-[15%] right-[15%] w-40 h-40 rounded-full border-[6px] border-[hsl(250,50%,40%)] opacity-40"
        delay={0}
      />
      <FloatingShape
        className="absolute top-[10%] right-[25%] w-24 h-24 bg-[hsl(250,40%,30%)] rounded-full opacity-30 blur-sm"
        delay={1}
      />
      <FloatingShape
        className="absolute top-[20%] right-[10%] w-8 h-8 bg-[hsl(200,80%,65%)] rounded-full opacity-60"
        delay={0.5}
      />
      <FloatingShape
        className="absolute bottom-[25%] left-[10%] w-0 h-0 border-l-[50px] border-l-transparent border-r-[50px] border-r-transparent border-b-[90px] border-b-[hsl(220,60%,55%)] opacity-30"
        delay={2}
      />
      <FloatingShape
        className="absolute bottom-[20%] left-[25%] w-6 h-6 bg-[hsl(30,60%,60%)] rounded-full opacity-50"
        delay={1.5}
      />
      <FloatingShape
        className="absolute top-[40%] right-[20%] w-3 h-40 bg-[hsl(230,30%,25%)] rounded-full opacity-40"
        delay={3}
      />
      <FloatingShape
        className="absolute bottom-[15%] right-[30%] w-6 h-6 bg-[hsl(0,60%,55%)] rounded-full opacity-40"
        delay={2.5}
      />

      {/* Large ring shape (3D-style) */}
      <div className="absolute top-[5%] right-[5%] w-64 h-64 sm:w-80 sm:h-80">
        <motion.div
          className="w-full h-full rounded-full border-[12px] border-[hsl(230,30%,22%)] relative"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 right-[15%] w-4 h-8 bg-[hsl(0,60%,50%)] rounded-full" />
          <div className="absolute bottom-[10%] left-0 w-6 h-12 bg-[hsl(30,50%,60%)] rounded-full opacity-70" />
        </motion.div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-32">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(220,60%,65%)] to-[hsl(174,72%,50%)]">
                RGPV Insight:
              </span>
              <br />
              Result Analysis &
              <br />
              Prediction Tool
            </h1>
          </motion.div>

          <motion.p
            className="text-base sm:text-lg text-[hsl(230,20%,60%)] max-w-xl mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Upload student data, fetch results from RGPV portal, and get powerful analytics with result prediction — all in one platform built for faculty.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Link to="/register">
              <Button size="lg" className="gap-2 bg-[hsl(240,50%,55%)] hover:bg-[hsl(240,50%,60%)] text-white border-0 px-8">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-[hsl(230,20%,30%)] text-[hsl(230,20%,70%)] hover:bg-[hsl(230,20%,15%)] bg-transparent px-8">
                Explore Features
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
