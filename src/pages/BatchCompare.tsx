import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BatchComparison } from "@/components/BatchComparison";
import { GitCompareArrows } from "lucide-react";

const BatchCompare = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-[hsl(280,67%,55%,0.12)]">
            <GitCompareArrows className="h-7 w-7 text-[hsl(280,67%,55%)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Batch Comparison</h1>
            <p className="text-sm text-muted-foreground">Compare two semester/batch results side-by-side</p>
          </div>
        </div>
        <BatchComparison />
      </div>
      <Footer />
    </div>
  );
};

export default BatchCompare;
