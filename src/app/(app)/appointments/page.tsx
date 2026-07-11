"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { AppointmentsClient } from "./_components/appointments-client";

function AppointmentsFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-10 w-48 rounded-full" />
      <Skeleton className="h-[480px] w-full rounded-2xl" />
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <React.Suspense fallback={<AppointmentsFallback />}>
      <AppointmentsClient />
    </React.Suspense>
  );
}
