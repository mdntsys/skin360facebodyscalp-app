"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";

import { useData } from "@/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/shell/change-password-form";

export function AccountCard() {
  const { profile } = useData();

  const initials = profile
    ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
    : "";

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

        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
