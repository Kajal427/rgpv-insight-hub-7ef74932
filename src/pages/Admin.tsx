import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Activity, Loader2, LayoutDashboard } from "lucide-react";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminActivityTable } from "@/components/admin/AdminActivityTable";
import { AdminRolesTable } from "@/components/admin/AdminRolesTable";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  phone: string | null;
  created_at: string;
  email: string;
  last_sign_in_at: string | null;
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
  const [tab, setTab] = useState<"overview" | "users" | "activity" | "roles">("overview");

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
        supabase.rpc("admin_get_all_profiles_with_email"),
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

  const recentSignups = profiles.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-[hsl(230,35%,10%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[hsl(220,60%,65%)] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "activity" as const, label: "Activity", icon: Activity },
    { key: "roles" as const, label: "Roles", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[hsl(230,35%,10%)]">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[hsl(38,92%,55%,0.12)]">
              <Shield className="h-7 w-7 text-[hsl(38,92%,55%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-[hsl(230,15%,45%)]">Manage users, monitor activity, and control roles</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[hsl(230,30%,12%)] p-1 rounded-xl border border-[hsl(230,20%,18%)] w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t.key
                  ? "bg-[hsl(240,50%,55%)] text-white shadow-lg shadow-[hsl(240,50%,55%,0.25)]"
                  : "text-[hsl(230,15%,45%)] hover:text-white hover:bg-[hsl(230,30%,16%)]"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <>
            <AdminStatsCards
              totalUsers={profiles.length}
              totalActivity={activities.length}
              totalAdmins={roles.filter((r) => r.role === "admin").length}
              recentSignups={recentSignups}
            />
            <div className="grid lg:grid-cols-2 gap-6">
              <AdminActivityTable activities={activities.slice(0, 15)} profiles={profiles} />
              <AdminUsersTable profiles={profiles.slice(0, 10)} roles={roles} onAddAdmin={addAdminRole} onRemoveRole={removeRole} />
            </div>
          </>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <AdminUsersTable profiles={profiles} roles={roles} onAddAdmin={addAdminRole} onRemoveRole={removeRole} />
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <AdminActivityTable activities={activities} profiles={profiles} />
        )}

        {/* Roles Tab */}
        {tab === "roles" && (
          <AdminRolesTable roles={roles} profiles={profiles} onRemoveRole={removeRole} />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
