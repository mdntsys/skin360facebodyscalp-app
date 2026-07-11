"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

import {
  appointments,
  formatCurrency,
  locationById,
  serviceById,
  staffById,
  type Client,
} from "@/data";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";

const headClass =
  "h-11 text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase";

export function AppointmentsTab({ client }: { client: Client }) {
  const history = appointments
    .filter((a) => a.clientId === client.id)
    .sort(
      (a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
    );

  if (history.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No appointments yet"
        description={`When ${client.firstName} books a visit, it will appear here.`}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <Card className="hidden border-line bg-white py-0 shadow-xs lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className={`${headClass} px-5`}>Date</TableHead>
              <TableHead className={headClass}>Time</TableHead>
              <TableHead className={headClass}>Service</TableHead>
              <TableHead className={headClass}>Staff</TableHead>
              <TableHead className={headClass}>Location</TableHead>
              <TableHead className={`${headClass} text-right`}>
                Price
              </TableHead>
              <TableHead className={`${headClass} px-5 text-right`}>
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((a) => {
              const start = new Date(a.startISO);
              const service = serviceById.get(a.serviceId);
              const esthetician = staffById.get(a.staffId);
              return (
                <TableRow
                  key={a.id}
                  className="border-line transition-colors hover:bg-cream/50"
                >
                  <TableCell className="px-5 py-3 text-sm text-ink">
                    {format(start, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-light text-ink-soft">
                    {format(start, "h:mm a")}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-ink">
                    {service?.name}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-light text-ink-soft">
                    {esthetician?.name}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-light text-ink-soft">
                    {locationById.get(a.locationId)?.shortName}
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm text-ink">
                    {formatCurrency(a.price)}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right">
                    <StatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {history.map((a) => {
          const start = new Date(a.startISO);
          const service = serviceById.get(a.serviceId);
          const esthetician = staffById.get(a.staffId);
          return (
            <div
              key={a.id}
              className="rounded-2xl border border-line bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm text-ink">{service?.name}</p>
                <StatusBadge status={a.status} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-light text-muted-warm">
                {format(start, "EEE, MMM d, yyyy")} · {format(start, "h:mm a")}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3">
                <p className="text-xs font-light text-muted-warm">
                  {esthetician?.name} ·{" "}
                  {locationById.get(a.locationId)?.shortName}
                </p>
                <p className="text-sm text-ink">{formatCurrency(a.price)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
