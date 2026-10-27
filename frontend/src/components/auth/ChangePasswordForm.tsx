"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccess } from "@/components/AccessProvider";

export function ChangePasswordForm() {
  const { me } = useAccess();
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.again) return toast.error("The new passwords don't match.");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: form.current, next: form.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || data.error || "Could not change the password.");
      window.location.href = "/";
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Set your password</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {me?.mustChangePassword
            ? `Welcome${me.name ? `, ${me.name}` : ""}. Replace the temporary password with one only you know.`
            : "Change the password you log in with."}
        </p>
      </div>
      <input type="text" autoComplete="username" value={me?.username ?? ""} readOnly hidden />
      <div className="grid gap-3">
        <Label htmlFor="current">{me?.mustChangePassword ? "Temporary password" : "Current password"}</Label>
        <Input id="current" type="password" autoComplete="current-password" required value={form.current} onChange={set("current")} />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="next">New password</Label>
        <Input id="next" type="password" autoComplete="new-password" minLength={8} required value={form.next} onChange={set("next")} />
        <p className="text-muted-foreground text-xs">At least 8 characters.</p>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="again">New password again</Label>
        <Input id="again" type="password" autoComplete="new-password" required value={form.again} onChange={set("again")} />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save password"}
      </Button>
    </form>
  );
}
