import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Brain, TrendingUp, Users, Award, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Analysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Result Analysis & Prediction</h1>
          <p className="text-muted-foreground">Upload a CSV from the dashboard to see analytics here.</p>
        </div>

        {/* Empty state */}
        <div className="bg-card border border-border rounded-xl p-12 card-glow text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">No Data Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Upload a CSV file with student enrollment numbers on the Dashboard. Results will be fetched from result.rgpv.com and analysis will appear here.
          </p>
          <Link to="/dashboard">
            <Button className="gap-2">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Analysis;
