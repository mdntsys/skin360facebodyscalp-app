"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { DataProvider, useData } from "@/data";
import { Button } from "@/components/ui/button";
import { LocationProvider } from "./location-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <LocationProvider>
        <ShellFrame>{children}</ShellFrame>
      </LocationProvider>
    </DataProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const { status, errorMessage, refresh } = useData();
  const [collapsed, setCollapsed] = React.useState(false);

  if (status !== "ready") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-ivory px-4">
        <div
          className={
            status === "loading"
              ? "flex size-16 animate-pulse items-center justify-center rounded-full border border-gold-200 bg-white shadow-sm"
              : "flex size-16 items-center justify-center rounded-full border border-gold-200 bg-white shadow-sm"
          }
        >
          <span className="font-heading text-2xl text-gold-600">S</span>
        </div>
        {status === "loading" ? (
          <p className="text-sm font-light text-muted-warm">
            Preparing your suite…
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="max-w-sm text-sm font-light text-muted-warm">
              We couldn&apos;t load your data
              {errorMessage ? ` (${errorMessage})` : ""}. Check your connection
              and try again.
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              <RotateCcw data-icon="inline-start" strokeWidth={1.75} />
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-svh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
