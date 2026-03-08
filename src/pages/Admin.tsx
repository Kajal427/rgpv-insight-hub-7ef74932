import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Activity, Loader2, Trash2, UserPlus } from "lucide-react";

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  phone: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "activity" | "roles">("users");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({ title: "Access Denied", description: "You are not an admin.", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [adminLoading, isAdmin, navigate, toast]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      const [profilesRes, activityRes, rolesRes] = await Promise.all([
        supabase.rpc("admin_get_all_profiles"),
        supabase.rpc("admin_get_all_activity"),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (activityRes.data) setActivities(activityRes.data as ActivityLog[]);
      if (rolesRes.data) setRoles(rolesRes.data as UserRole[]);
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  const addAdminRole = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin role added!" });
      setRoles([...roles, { id: crypto.randomUUID(), user_id: userId, role: "admin", created_at: new Date().toISOString() }]);
    }
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removed!" });
      setRoles(roles.filter((r) => r.id !== roleId));
    }
  };

  const getUserName = (userId: string) => {
    const p = profiles.find((p) => p.user_id === userId);
    return p?.full_name || userId.slice(0, 8) + "...";
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-[hsl(230,35%,10%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[hsl(220,60%,65%)] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[hsl(230,35%,10%)]">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="font-display text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8 text-[hsl(220,60%,65%)]" /> Admin Panel
        </h1>
        <p className="text-[hsl(230,15%,50%)] mb-8">Manage users, roles, and view activity</p>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Users", value: profiles.length, icon: Users },
            { label: "Activity Logs", value: activities.length, icon: Activity },
            { label: "Admin Users", value: roles.filter((r) => r.role === "admin").length, icon: Shield },
          ].map((s) => (
            <div key={s.label} className={`${cardClasses} p-6`}>
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-[hsl(220,60%,65%)]" />
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-sm text-[hsl(230,15%,50%)]">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["users", "activity", "roles"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t)}
              className={tab === t
                ? "bg-[hsl(240,50%,55%)] text-white"
                : "border-[hsl(230,20%,20%)] text-[hsl(230,15%,50%)] hover:bg-[hsl(240,50%,55%,0.1)]"
              }
            >
              {t === "users" ? "Users" : t === "activity" ? "Activity Logs" : "Roles"}
            </Button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <div className={`${cardClasses} p-6`}>
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-[hsl(220,60%,65%)]" /> All Registered Users
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(230,20%,20%)]">
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">#</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Department</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Registered</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p, i) => {
                    const userRole = roles.find((r) => r.user_id === p.user_id);
                    return (
                      <tr key={p.id} className="border-b border-[hsl(230,20%,18%)] hover:bg-[hsl(240,50%,55%,0.05)]">
                        <td className="py-3 px-4 text-[hsl(230,15%,45%)]">{i + 1}</td>
                        <td className="py-3 px-4 text-white font-medium">{p.full_name}</td>
                        <td className="py-3 px-4 text-[hsl(230,15%,60%)]">{p.department}</td>
                        <td className="py-3 px-4 text-[hsl(230,15%,60%)]">{p.phone || "—"}</td>
                        <td className="py-3 px-4 text-[hsl(230,15%,50%)]">
                          {new Date(p.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            userRole?.role === "admin"
                              ? "bg-[hsl(220,60%,65%,0.15)] text-[hsl(220,60%,65%)]"
                              : "bg-[hsl(230,20%,18%)] text-[hsl(230,15%,50%)]"
                          }`}>
                            {userRole?.role || "user"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!userRole ? (
                            <Button size="sm" variant="ghost" className="gap-1 text-xs text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)]" onClick={() => addAdminRole(p.user_id)}>
                              <UserPlus className="h-3 w-3" /> Make Admin
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="gap-1 text-xs text-red-400 hover:bg-red-500/10" onClick={() => removeRole(userRole.id)}>
                              <Trash2 className="h-3 w-3" /> Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {profiles.length === 0 && (
                <p className="text-center text-[hsl(230,15%,40%)] py-8">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <div className={`${cardClasses} p-6`}>
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[hsl(220,60%,65%)]" /> Recent Activity
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(230,20%,20%)]">
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">User</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Action</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Details</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} className="border-b border-[hsl(230,20%,18%)] hover:bg-[hsl(240,50%,55%,0.05)]">
                      <td className="py-3 px-4 text-white">{getUserName(a.user_id)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[hsl(240,50%,55%,0.15)] text-[hsl(220,60%,65%)]">
                          {a.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[hsl(230,15%,50%)] text-xs font-mono max-w-xs truncate">
                        {a.details ? JSON.stringify(a.details) : "—"}
                      </td>
                      <td className="py-3 px-4 text-[hsl(230,15%,50%)]">
                        {new Date(a.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activities.length === 0 && (
                <p className="text-center text-[hsl(230,15%,40%)] py-8">No activity found</p>
              )}
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {tab === "roles" && (
          <div className={`${cardClasses} p-6`}>
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(220,60%,65%)]" /> User Roles
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(230,20%,20%)]">
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">User</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Assigned</th>
                    <th className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id} className="border-b border-[hsl(230,20%,18%)] hover:bg-[hsl(240,50%,55%,0.05)]">
                      <td className="py-3 px-4 text-white">{getUserName(r.user_id)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[hsl(220,60%,65%,0.15)] text-[hsl(220,60%,65%)]">
                          {r.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[hsl(230,15%,50%)]">
                        {new Date(r.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs text-red-400 hover:bg-red-500/10" onClick={() => removeRole(r.id)}>
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {roles.length === 0 && (
                <p className="text-center text-[hsl(230,15%,40%)] py-8">No roles assigned yet</p>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
