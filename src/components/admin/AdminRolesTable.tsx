import { Button } from "@/components/ui/button";
import { Shield, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface AdminRolesTableProps {
  roles: UserRole[];
  profiles: Profile[];
  onRemoveRole: (roleId: string) => void;
}

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

export const AdminRolesTable = ({ roles, profiles, onRemoveRole }: AdminRolesTableProps) => {
  const getUserName = (userId: string) => {
    const p = profiles.find((p) => p.user_id === userId);
    return p?.full_name || userId.slice(0, 8) + "...";
  };

  return (
    <div className={`${cardClasses} p-6`}>
      <h2 className="font-display text-lg font-semibold text-white mb-5 flex items-center gap-2">
        <Shield className="h-5 w-5 text-[hsl(38,92%,55%)]" /> User Roles
        <span className="text-xs font-normal text-[hsl(230,15%,45%)] ml-1">({roles.length})</span>
      </h2>
      <div className="grid gap-3">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4 rounded-lg bg-[hsl(230,30%,12%)] border border-[hsl(230,20%,18%)] hover:border-[hsl(230,20%,22%)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[hsl(38,92%,55%,0.12)] flex items-center justify-center text-sm font-bold text-[hsl(38,92%,60%)]">
                {getUserName(r.user_id).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{getUserName(r.user_id)}</p>
                <p className="text-xs text-[hsl(230,15%,40%)]">
                  Assigned {new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(38,92%,55%,0.15)] text-[hsl(38,92%,60%)]">
                {r.role}
              </span>
              <Button size="sm" variant="ghost" className="gap-1 text-xs text-red-400 hover:bg-red-500/10 h-7" onClick={() => onRemoveRole(r.id)}>
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-center text-[hsl(230,15%,35%)] py-10">No roles assigned yet</p>
        )}
      </div>
    </div>
  );
};
