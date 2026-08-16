"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { useData } from "@/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function StaffLoginsCard() {
  const { appSettings, updateAppSettings } = useData();
  const [toggling, setToggling] = React.useState(false);

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      await updateAppSettings({ staffSeesAllSchedules: enabled });
      toast.success(
        enabled
          ? "Staff logins now see the whole team's schedule."
          : "Staff logins now see only their own schedule."
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card className="mt-6 max-w-3xl border-line bg-white shadow-xs">
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
          <KeyRound className="size-[18px] text-gold-600" strokeWidth={1.75} />
        </div>
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Staff Logins
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Team members sign in with their own email and see the schedule —
            nothing else.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-ivory/50 px-4 py-3.5">
          <div>
            <p className="text-sm text-ink">
              Girls can see each other&apos;s schedules
            </p>
            <p className="text-xs font-light text-muted-warm">
              Off: each girl sees only her own appointments. On: everyone sees
              the whole week for the team.
            </p>
          </div>
          <Switch
            checked={appSettings.staffSeesAllSchedules}
            disabled={toggling}
            onCheckedChange={(checked) => void handleToggle(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
