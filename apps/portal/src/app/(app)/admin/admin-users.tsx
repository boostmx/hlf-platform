"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hlf/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Button } from "@hlf/ui/button";
import { Input } from "@hlf/ui/input";
import { Label } from "@hlf/ui/label";
import { Badge } from "@hlf/ui/badge";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
};

export function AdminUsersTable({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: AdminUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [actionId, setActionId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function toggleAdmin(user: AdminUser) {
    const next = !user.isAdmin;
    setActionId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: next }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed");
      }
      setUsers((list) =>
        list.map((u) => (u.id === user.id ? { ...u, isAdmin: next } : u)),
      );
      toast.success(next ? "Admin access granted" : "Admin access removed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionId(null);
    }
  }

  async function submitReset() {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setActionId(resetTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed");
      }
      toast.success(`Password reset for @${resetTarget.username}`);
      setResetTarget(null);
      setNewPassword("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Users</CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {users.length} total
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">User</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Joined</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              @{u.username}
                              {isSelf && <span className="ml-1.5 opacity-60">(you)</span>}
                            </span>
                          </div>
                          {u.isAdmin && (
                            <Badge variant="default" className="text-[10px] h-5">
                              admin
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px] font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy || (isSelf && u.isAdmin)}
                            onClick={() => toggleAdmin(u)}
                            title={u.isAdmin ? "Remove admin" : "Grant admin"}
                          >
                            {u.isAdmin ? (
                              <ShieldOff className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1.5">
                              {u.isAdmin ? "Remove admin" : "Make admin"}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setResetTarget(u)}
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span className="ml-1.5">Reset</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-mono">@{resetTarget?.username}</span>. They&apos;ll be
              signed in with the new password from now on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="resetPassword">New password</Label>
            <Input
              id="resetPassword"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setResetTarget(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={actionId === resetTarget?.id}>
              {actionId === resetTarget?.id ? "Saving…" : "Set new password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
