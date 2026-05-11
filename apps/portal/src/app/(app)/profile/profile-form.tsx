"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Button } from "@hlf/ui/button";
import { Input } from "@hlf/ui/input";
import { Label } from "@hlf/ui/label";

type ProfileValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  bio: string;
  avatarUrl: string;
};

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const { update } = useSession();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  function field<K extends keyof ProfileValues>(key: K) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  const dirty =
    values.firstName !== initial.firstName ||
    values.lastName !== initial.lastName ||
    values.email !== initial.email ||
    values.bio !== initial.bio ||
    values.avatarUrl !== initial.avatarUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          bio: values.bio || null,
          avatarUrl: values.avatarUrl || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to save");
      }
      await update();
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" required {...field("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" required {...field("lastName")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={values.username} disabled className="opacity-70" />
            <p className="text-[11px] text-muted-foreground">
              Usernames can&apos;t be changed from here — contact an admin if you need to.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required {...field("email")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              {...field("bio")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" type="url" placeholder="https://…" {...field("avatarUrl")} />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
