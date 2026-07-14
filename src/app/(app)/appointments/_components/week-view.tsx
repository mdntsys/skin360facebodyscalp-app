"use client";

import { addDays, format, isSameDay, isToday } from "date-fns";

import { useData, type Appointment } from "@/data";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WeekView({
  weekStart,
  appointments,
  onSelect,
}: {
  weekStart: Date;
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
}) {
  const { clientById, serviceById, staffById } = useData();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Card className="gap-0 border-line bg-white py-0 shadow-xs">
      <div className="overflow-x-auto">
        <div className="flex min-w-fit">
          {days.map((day) => {
            const dayAppts = appointments
              .filter((a) => isSameDay(new Date(a.startISO), day))
              .sort((a, b) => a.startISO.localeCompare(b.startISO));
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className="flex min-w-[150px] flex-1 flex-col border-l border-line/60 first:border-l-0"
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 border-b border-line px-2 pt-3 pb-2.5",
                    today && "bg-gold-50/60"
                  )}
                >
                  <span className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full font-heading text-base",
                      today
                        ? "bg-gold-gradient text-white shadow-sm"
                        : "text-ink"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex min-h-44 flex-1 flex-col gap-1.5 p-1.5",
                    today && "bg-gold-50/25"
                  )}
                >
                  {dayAppts.length === 0 && (
                    <p className="py-6 text-center text-[11px] font-light text-muted-warm/70">
                      —
                    </p>
                  )}
                  {dayAppts.map((a) => {
                    const start = new Date(a.startISO);
                    const cancelled = a.status === "cancelled";
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a)}
                        className={cn(
                          "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-left shadow-xs transition-all hover:border-gold-300 hover:shadow-sm",
                          cancelled && "opacity-50",
                          a.status === "no-show" && "border-red-100 bg-red-50"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: staffById.get(a.staffId)?.color,
                            }}
                          />
                          <span className="truncate text-[11px] font-light text-muted-warm">
                            {format(start, "h:mma").toLowerCase()}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-xs text-ink",
                            cancelled && "line-through"
                          )}
                        >
                          {clientById.get(a.clientId)?.firstName ?? "Client"}
                        </span>
                        <span className="block truncate text-[10px] font-light text-muted-warm">
                          {serviceById.get(a.serviceId)?.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
