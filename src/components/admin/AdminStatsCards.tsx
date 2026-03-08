import { Users, Activity, Shield, TrendingUp } from "lucide-react";

interface AdminStatsCardsProps {
  totalUsers: number;
  totalActivity: number;
  totalAdmins: number;
  recentSignups: number;
}

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

export const AdminStatsCards = ({ totalUsers, totalActivity, totalAdmins, recentSignups }: AdminStatsCardsProps) => {
  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "hsl(220,60%,65%)", bg: "hsl(220,60%,65%,0.12)" },
    { label: "Activity Logs", value: totalActivity, icon: Activity, color: "hsl(174,72%,50%)", bg: "hsl(174,72%,50%,0.12)" },
    { label: "Admin Users", value: totalAdmins, icon: Shield, color: "hsl(38,92%,55%)", bg: "hsl(38,92%,55%,0.12)" },
    { label: "Recent Signups (7d)", value: recentSignups, icon: TrendingUp, color: "hsl(280,60%,65%)", bg: "hsl(280,60%,65%,0.12)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className={`${cardClasses} p-5 hover:border-[hsl(230,20%,25%)] transition-colors`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: s.bg }}>
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
              <p className="text-xs text-[hsl(230,15%,45%)] mt-1">{s.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
