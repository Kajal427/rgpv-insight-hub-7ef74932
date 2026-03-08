import { Activity, Filter } from "lucide-react";
import { useState } from "react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

interface AdminActivityTableProps {
  activities: ActivityLog[];
  profiles: Profile[];
}

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

const actionColors: Record<string, { bg: string; text: string }> = {
  login: { bg: "hsl(174,72%,50%,0.12)", text: "hsl(174,72%,55%)" },
  logout: { bg: "hsl(0,60%,50%,0.12)", text: "hsl(0,60%,60%)" },
  csv_upload: { bg: "hsl(220,60%,65%,0.12)", text: "hsl(220,60%,65%)" },
  result_fetch: { bg: "hsl(280,60%,65%,0.12)", text: "hsl(280,60%,65%)" },
  export_excel: { bg: "hsl(38,92%,55%,0.12)", text: "hsl(38,92%,60%)" },
};

export const AdminActivityTable = ({ activities, profiles }: AdminActivityTableProps) => {
  const [filterAction, setFilterAction] = useState<string>("all");

  const getUserName = (userId: string) => {
    const p = profiles.find((p) => p.user_id === userId);
    return p?.full_name || userId.slice(0, 8) + "...";
  };

  const uniqueActions = [...new Set(activities.map((a) => a.action))];
  const filtered = filterAction === "all" ? activities : activities.filter((a) => a.action === filterAction);

  return (
    <div className={`${cardClasses} p-6`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-[hsl(174,72%,50%)]" /> Activity Feed
          <span className="text-xs font-normal text-[hsl(230,15%,45%)] ml-1">({activities.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[hsl(230,15%,40%)]" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs rounded-lg bg-[hsl(230,30%,10%)] border border-[hsl(230,20%,20%)] text-[hsl(230,15%,55%)] px-3 py-1.5 focus:outline-none focus:border-[hsl(240,50%,45%)]"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map((a) => {
          const colors = actionColors[a.action] || { bg: "hsl(240,50%,55%,0.12)", text: "hsl(220,60%,65%)" };
          return (
            <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-[hsl(230,30%,12%)] transition-colors group">
              <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                {getUserName(a.user_id).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{getUserName(a.user_id)}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: colors.bg, color: colors.text }}>
                    {a.action}
                  </span>
                </div>
                {a.details && (
                  <p className="text-xs text-[hsl(230,15%,40%)] mt-0.5 truncate font-mono">
                    {typeof a.details === "object" ? JSON.stringify(a.details) : String(a.details)}
                  </p>
                )}
              </div>
              <span className="text-xs text-[hsl(230,15%,38%)] shrink-0">
                {new Date(a.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-[hsl(230,15%,35%)] py-10">No activity found</p>
        )}
      </div>
    </div>
  );
};
