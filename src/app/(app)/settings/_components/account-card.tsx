"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useData } from "@/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function AccountCard() {
  const { profile } = useData();
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const initials = profile
    ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
    : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      toast.success("Password updated.");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-3xl border-line bg-white shadow-xs">
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
          <KeyRound className="size-[18px] text-gold-600" strokeWidth={1.75} />
        </div>
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Account
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Your sign-in details for the business suite.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {profile ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-ivory/50 px-4 py-3.5">
            <Avatar className="size-11">
              <AvatarFallback className="bg-gold-50 text-xs font-medium text-gold-700">
                {initials || "—"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="truncate text-xs font-light text-muted-warm">
                {profile.email || "No email on file"}
              </p>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm font-light text-muted-warm">
            Profile still loading.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className={labelClass}>
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className={labelClass}>
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the new password"
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !password || !confirm}
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
