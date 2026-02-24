import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Brain, TrendingUp, Users, Award } from "lucide-react";

const subjectData = [
  { subject: "Maths", avg: 72, pass: 85 },
  { subject: "Physics", avg: 65, pass: 78 },
  { subject: "DSA", avg: 78, pass: 90 },
  { subject: "DBMS", avg: 70, pass: 82 },
  { subject: "OS", avg: 68, pass: 80 },
  { subject: "Networks", avg: 74, pass: 88 },
];

const gradeDistribution = [
  { name: "A+", value: 15, color: "hsl(174, 72%, 50%)" },
  { name: "A", value: 25, color: "hsl(174, 72%, 40%)" },
  { name: "B", value: 30, color: "hsl(210, 100%, 52%)" },
  { name: "C", value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "F", value: 10, color: "hsl(0, 84%, 60%)" },
];

const trendData = [
  { sem: "Sem 1", sgpa: 7.2 },
  { sem: "Sem 2", sgpa: 7.5 },
  { sem: "Sem 3", sgpa: 7.8 },
  { sem: "Sem 4", sgpa: 8.1 },
  { sem: "Sem 5", sgpa: 7.9 },
  { sem: "Sem 6", sgpa: 8.4 },
  { sem: "Sem 7", sgpa: 8.6 },
  { sem: "Sem 8 (Pred)", sgpa: 8.8 },
];

const stats = [
  { icon: Users, label: "Total Students", value: "256" },
  { icon: Award, label: "Pass Rate", value: "87%" },
  { icon: TrendingUp, label: "Avg SGPA", value: "7.8" },
  { icon: Brain, label: "Predicted Next SGPA", value: "8.2" },
];

const Analysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Result Analysis & Prediction</h1>
          <p className="text-muted-foreground">Comprehensive analytics based on uploaded student data</p>
        </div>

        {/* Stat Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 card-glow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-display font-bold">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Subject-wise Performance */}
          <div className="bg-card border border-border rounded-xl p-6 card-glow">
            <h3 className="font-display text-lg font-semibold mb-4">Subject-wise Average Marks</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grade Distribution */}
          <div className="bg-card border border-border rounded-xl p-6 card-glow">
            <h3 className="font-display text-lg font-semibold mb-4">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gradeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {gradeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SGPA Trend & Prediction */}
        <div className="bg-card border border-border rounded-xl p-6 card-glow mb-8">
          <h3 className="font-display text-lg font-semibold mb-2">SGPA Trend & Prediction</h3>
          <p className="text-sm text-muted-foreground mb-4">Historical performance with AI-predicted next semester SGPA</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="sem" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis domain={[6, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="sgpa" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 rounded-lg bg-accent border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary" />
              <span className="font-display font-semibold text-sm">AI Prediction</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on historical trends, the predicted SGPA for Semester 8 is <span className="text-primary font-bold">8.8</span> with a confidence of <span className="text-primary font-bold">92%</span>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Analysis;
