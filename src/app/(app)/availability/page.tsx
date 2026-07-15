"use client";

import * as React from "react";

import { useData } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { BookingPreview } from "./_components/booking-preview";
import { TimeOff } from "./_components/time-off";
import { WeeklySchedule } from "./_components/weekly-schedule";
import { FIELD_CLASSES } from "./_components/shared";

export default function AvailabilityPage() {
  const { staff } = useData();

  const [staffIdState, setStaffIdState] = React.useState("");
  const selectedStaffId =
    staffIdState && staff.some((s) => s.id === staffIdState)
      ? staffIdState
      : (staff[0]?.id ?? "");

  return (
    <>
      <PageHeader
        title="Availability"
        subtitle="Contractor schedules, time off, and a live booking preview."
        actions={
          staff.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-wide text-muted-warm uppercase">
                Provider
              </span>
              <Select value={selectedStaffId} onValueChange={setStaffIdState}>
                <SelectTrigger
                  className={cn(
                    FIELD_CLASSES,
                    "h-10 w-56 data-[size=default]:h-10"
                  )}
                  aria-label="Provider"
                >
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      />

      {selectedStaffId ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WeeklySchedule staffId={selectedStaffId} />
          </div>
          <TimeOff staffId={selectedStaffId} />
        </div>
      ) : (
        <Card className="border-line bg-white shadow-xs">
          <CardContent className="py-12 text-center text-sm font-light text-muted-warm">
            No bookable providers yet. Mark a staff member as bookable in
            Settings to set their schedule.
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <BookingPreview />
      </div>
    </>
  );
}
