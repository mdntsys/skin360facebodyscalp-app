"use client";

import * as React from "react";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useData, type ClinicLocation, type Room } from "@/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { RoomFormDialog } from "./room-form-dialog";

function capacityLabel(capacity: number) {
  return capacity > 1 ? `${capacity} concurrent` : "1 at a time";
}

function LocationRooms({ location }: { location: ClinicLocation }) {
  const { rooms, createRoom, updateRoom, deleteRoom } = useData();
  const locationRooms = rooms.filter((r) => r.locationId === location.id);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Room | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Room | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const callOnly = location.bookingMode === "call-only";

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteRoom(pendingDelete.id);
      toast.success(`${pendingDelete.name} removed.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-line bg-white shadow-xs">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
            <DoorOpen className="size-[18px] text-gold-600" strokeWidth={1.75} />
          </div>
          <div>
            <CardTitle className="font-heading text-xl font-medium">
              {location.name}
            </CardTitle>
            <p className="text-xs font-light text-muted-warm">
              {locationRooms.length === 0
                ? "No treatment rooms"
                : `${locationRooms.length} treatment room${locationRooms.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {!callOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus data-icon="inline-start" strokeWidth={1.75} />
            Add room
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {locationRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-ivory/50 px-4 py-8 text-center text-sm font-light text-muted-warm">
            {callOnly
              ? "No rooms — call-only location"
              : "No rooms yet. Add one to start assigning appointments."}
          </div>
        ) : (
          <div className="divide-y divide-line/70">
            {locationRooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-ink">{room.name}</p>
                    <span className="text-xs font-light text-muted-warm">
                      {capacityLabel(room.capacity)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {room.categories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className="rounded-full border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${room.name}`}
                    onClick={() => {
                      setEditing(room);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil strokeWidth={1.75} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${room.name}`}
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setPendingDelete(room)}
                  >
                    <Trash2 strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <RoomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        locationName={location.name}
        room={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateRoom(editing.id, {
              locationId: editing.locationId,
              sort: editing.sort,
              ...values,
            });
            toast.success(`${values.name} updated.`);
          } else {
            const nextSort =
              locationRooms.reduce((max, r) => Math.max(max, r.sort), 0) + 1;
            await createRoom({
              locationId: location.id,
              sort: nextSort,
              ...values,
            });
            toast.success(`${values.name} added.`);
          }
        }}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="rounded-3xl bg-white p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-medium text-ink">
              Delete {pendingDelete?.name}?
            </DialogTitle>
            <DialogDescription className="text-sm font-light text-muted-warm">
              Past appointments are kept — their room assignment simply clears.
              New bookings won&apos;t be able to use this room.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function RoomsSection() {
  const { locations } = useData();

  if (locations.length === 0) {
    return (
      <p className="py-8 text-center text-sm font-light text-muted-warm">
        No locations yet.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {locations.map((loc) => (
        <LocationRooms key={loc.id} location={loc} />
      ))}
    </div>
  );
}
