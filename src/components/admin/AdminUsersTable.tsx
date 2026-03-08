import { Button } from "@/components/ui/button";
import { Users, UserPlus, Trash2, Search, UserX, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface AdminUsersTableProps {
  profiles: Profile[];
  roles: UserRole[];
  onAddAdmin: (userId: string) => void;
  onRemoveRole: (roleId: string) => void;
  onDeleteUser: (userId: string, userName: string) => Promise<void>;
  currentUserId?: string;
}

const cardClasses = "bg-[hsl(230,30%,14%)] border border-[hsl(230,20%,20%)] rounded-xl shadow-[0_8px_32px_-8px_hsl(240,50%,15%,0.3)]";

export const AdminUsersTable = ({ profiles, roles, onAddAdmin, onRemoveRole, onDeleteUser, currentUserId }: AdminUsersTableProps) => {
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [deleting, setDeleting] = useState(false);

  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await onDeleteUser(deleteDialog.userId, deleteDialog.userName);
    setDeleting(false);
    setDeleteDialog({ open: false, userId: "", userName: "" });
  };

  return (
    <>
      <div className={`${cardClasses} p-6`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(220,60%,65%)]" /> All Registered Users
            <span className="text-xs font-normal text-[hsl(230,15%,45%)] ml-1">({profiles.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(230,15%,40%)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-lg bg-[hsl(230,30%,10%)] border border-[hsl(230,20%,20%)] text-white placeholder:text-[hsl(230,15%,35%)] focus:outline-none focus:border-[hsl(240,50%,45%)] w-56"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(230,20%,20%)]">
                {["#", "Name", "Email", "Department", "Phone", "Registered", "Last Login", "Role", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[hsl(230,15%,45%)] font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const userRole = roles.find((r) => r.user_id === p.user_id);
                const isCurrentUser = p.user_id === currentUserId;
                return (
                  <tr key={p.id} className="border-b border-[hsl(230,20%,16%)] hover:bg-[hsl(240,50%,55%,0.04)] transition-colors">
                    <td className="py-3 px-4 text-[hsl(230,15%,40%)]">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[hsl(240,50%,55%,0.15)] flex items-center justify-center text-xs font-bold text-[hsl(220,60%,65%)]">
                          {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <span className="text-white font-medium">{p.full_name}</span>
                          {isCurrentUser && <span className="ml-2 text-[10px] text-[hsl(38,92%,55%)]">(You)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[hsl(230,15%,55%)]">{p.email || "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-[hsl(230,20%,18%)] text-[hsl(230,15%,55%)]">
                        {p.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[hsl(230,15%,55%)]">{p.phone || "—"}</td>
                    <td className="py-3 px-4 text-[hsl(230,15%,45%)] text-xs">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 px-4 text-[hsl(230,15%,45%)] text-xs">
                      {p.last_sign_in_at
                        ? new Date(p.last_sign_in_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        userRole?.role === "admin"
                          ? "bg-[hsl(38,92%,55%,0.15)] text-[hsl(38,92%,60%)]"
                          : "bg-[hsl(230,20%,18%)] text-[hsl(230,15%,50%)]"
                      }`}>
                        {userRole?.role || "user"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {!userRole ? (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs text-[hsl(220,60%,65%)] hover:bg-[hsl(240,50%,55%,0.1)] h-7" onClick={() => onAddAdmin(p.user_id)}>
                            <UserPlus className="h-3 w-3" /> Admin
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs text-amber-400 hover:bg-amber-500/10 h-7" onClick={() => onRemoveRole(userRole.id)}>
                            <Trash2 className="h-3 w-3" /> Role
                          </Button>
                        )}
                        {!isCurrentUser && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs text-red-400 hover:bg-red-500/10 h-7"
                            onClick={() => setDeleteDialog({ open: true, userId: p.user_id, userName: p.full_name })}
                          >
                            <UserX className="h-3 w-3" /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-[hsl(230,15%,35%)] py-10">No users found</p>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[hsl(230,30%,12%)] border-[hsl(230,20%,20%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-400" /> Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(230,15%,50%)]">
              Are you sure you want to permanently delete <span className="text-white font-medium">{deleteDialog.userName}</span>'s account?
              This will remove all their data including profile, activity logs, and roles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[hsl(230,30%,16%)] border-[hsl(230,20%,22%)] text-[hsl(230,15%,55%)] hover:bg-[hsl(230,30%,20%)] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
              {deleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
