"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";

import { useData } from "@/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BookingPolicyCard() {
  const { appSettings, updateAppSettings } = useData();
  const [toggling, setToggling] = React.useState(false);
  const [notice, setNotice] = React.useState(String(appSettings.minNoticeHours));
  const [savingNotice, setSavingNotice] = React.useState(false);

  React.useEffect(() => {
    setNotice(String(appSettings.minNoticeHours));
  }, [appSettings.minNoticeHours]);

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      await updateAppSettings({ onlineBookingEnabled: enabled });
      toast.success(
        enabled
          ? "Online booking switched on."
          : "Online booking switched off."
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

  async function commitNotice() {
    const next = Math.max(0, Math.round(Number(notice) || 0));
    setNotice(String(next));
    if (next === appSettings.minNoticeHours) return;
    setSavingNotice(true);
    try {
      await updateAppSettings({ minNoticeHours: next });
      toast.success(`Minimum notice set to ${next} hours.`);
    } catch (err) {
      setNotice(String(appSettings.minNoticeHours));
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSavingNotice(false);
    }
  }

  return (
    <Card className="max-w-3xl border-line bg-white shadow-xs">
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
          <Globe className="size-[18px] text-gold-600" strokeWidth={1.75} />
        </div>
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Booking Policy
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Controls for online booking once the public site connects.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-ivory/50 px-4 py-3.5">
          <div>
            <p className="text-sm text-ink">Online booking on the website</p>
            <p className="text-xs font-light text-muted-warm">
              The public site isn&apos;t connected yet — this is the master
              gate it will honor when it goes live.
            </p>
          </div>
          <Switch
            checked={appSettings.onlineBookingEnabled}
            disabled={toggling}
            onCheckedChange={(checked) => void handleToggle(checked)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/70 bg-ivory/50 px-4 py-3.5">
          <div>
            <Label
              htmlFor="min-notice-hours"
              className="text-sm font-normal text-ink"
            >
              Minimum notice (hours)
            </Label>
            <p className="text-xs font-light text-muted-warm">
              Providers must lock in availability changes at least this many
              hours ahead.
            </p>
          </div>
          <Input
            id="min-notice-hours"
            type="number"
            min={0}
            step={1}
            value={notice}
            disabled={savingNotice}
            onChange={(e) => setNotice(e.target.value)}
            onBlur={() => void commitNotice()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-9 w-24 shrink-0 rounded-full border-line bg-white px-3 text-center text-sm tabular-nums focus-visible:border-gold-300"
          />
        </div>
      </CardContent>
    </Card>
  );
}
