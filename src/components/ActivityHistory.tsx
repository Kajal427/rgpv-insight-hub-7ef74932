import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Upload, Download, BarChart3, LogIn, LogOut, UserPlus, Search, Activity, Trash2, ChevronDown } from "lucide-react";

type ActivityEntry = {
  id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
};

const ACTION_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  login: { icon: LogIn, label: "Logged In", color: "text-green-500" },
  logout: { icon: LogOut, label: "Logged Out", color: "text-red-400" },
  csv_upload: { icon: Upload, label: "Uploaded CSV", color: "text-blue-500" },
  export_excel: { icon: Download, label: "Exported Excel", color: "text-purple-500" },
  view_analysis: { icon: BarChart3, label: "Viewed Analysis", color: "text-amber-500" },
  result_fetch: { icon: Search, label: "Fetched Results", color: "text-cyan-500" },
  register: { icon: UserPlus, label: "Registered", color: "text-emerald-500" },
};

const DEFAULT_CONFIG = { icon: Activity, label: "Activity", color: "text-muted-foreground" };

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDetails(action: string, details: Record<string, any>): string {
  switch (action) {
    case "csv_upload":
      return details.count ? `${details.count} enrollments` : "";
    case "result_fetch":
      return details.program && details.semester
        ? `${details.program} Sem ${details.semester} — ${details.total || 0} students`
        : "";
    case "export_excel":
      return details.program ? `${details.program} Sem ${details.semester}` : "";
    default:
      return "";
  }
}

export function ActivityHistory() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setActivities(data as unknown as ActivityEntry[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("activity_log").delete().eq("id", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 card-glow">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Activity History
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-glow">
      <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" /> Activity History
      </h2>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No activity yet. Start by uploading a CSV!</p>
      ) : (
        <div className="space-y-1">
          {activities.map((a) => {
            const config = ACTION_CONFIG[a.action] || DEFAULT_CONFIG;
            const Icon = config.icon;
            const detail = getDetails(a.action, a.details || {});
            return (
              <div key={a.id} className="rounded-lg overflow-hidden">
                <div
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  className="flex items-center gap-3 py-2.5 px-3 hover:bg-secondary/40 transition-colors group cursor-pointer"
                >
                  <div className={`shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{config.label}</p>
                    {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatTime(a.created_at)}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${expandedId === a.id ? "rotate-180" : ""}`} />
                </div>
                {expandedId === a.id && (
                  <div className="px-3 pb-3 pt-1 bg-secondary/20 border-t border-border/50 animate-fade-in">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-3">
                      <div>
                        <span className="text-muted-foreground">Action:</span>{" "}
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>{" "}
                        <span className="font-medium">
                          {new Date(a.created_at).toLocaleString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </span>
                      </div>
                      {Object.entries(a.details || {}).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                      className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Delete this activity
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Helper to log an activity — fire and forget */
export async function logActivity(action: string, details: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from("activity_log").insert({
    user_id: session.user.id,
    action,
    details,
  });
}
