"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  useData,
  type EmploymentType,
  type ServiceCategory,
  type StaffMember,
} from "@/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Facials",
  "Advanced Treatments",
  "Body",
  "Scalp",
  "Nails",
];

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  owner: "Owner",
  admin: "Admin",
  employee: "Employee",
  "contractor-1099": "1099 Contractor",
};

function EmploymentBadge({ type }: { type: EmploymentType }) {
  const gold = type === "owner";
  return (
    <Badge
      variant="outline"
      className={
        gold
          ? "rounded-full border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700"
          : "rounded-full border-line bg-cream px-2.5 py-0.5 text-[11px] font-normal text-ink-soft"
      }
    >
      {EMPLOYMENT_LABELS[type]}
    </Badge>
  );
}

function CapabilitiesDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: StaffMember;
}) {
  const { services, updateStaff } = useData();
  const [submitting, setSubmitting] = React.useState(false);
  const [allServices, setAllServices] = React.useState(true);
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setAllServices(member.serviceIds.length === 0);
    setSelected(member.serviceIds);
  }, [open, member]);

  async function handleSave() {
    if (!allServices && selected.length === 0) {
      toast.error(
        "Select at least one service, or switch back to All services."
      );
      return;
    }
    setSubmitting(true);
    try {
      await updateStaff(member.id, {
        serviceIds: allServices ? [] : selected,
      });
      toast.success(`${member.name.split(" ")[0]}'s services updated.`);
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-white p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            Services — {member.name}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Choose which services {member.name.split(" ")[0]} can be booked
            for.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold-200/70 bg-gold-50/50 px-4 py-3">
            <div>
              <p className="text-sm text-ink">All services</p>
              <p className="text-xs font-light text-muted-warm">
                Bookable for the entire menu, including services added later.
              </p>
            </div>
            <Switch
              checked={allServices}
              onCheckedChange={(checked) => {
                setAllServices(checked);
                if (!checked && selected.length === 0)
                  setSelected(services.map((s) => s.id));
              }}
            />
          </div>

          {!allServices && (
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-2xl border border-line/70 bg-ivory/50 p-4">
              {services.length === 0 && (
                <p className="py-4 text-center text-sm font-light text-muted-warm">
                  No services on the menu yet.
                </p>
              )}
              {SERVICE_CATEGORIES.map((cat) => {
                const items = services.filter((s) => s.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="mb-2 text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                      {cat}
                    </p>
                    <div className="space-y-2.5">
                      {items.map((svc) => (
                        <label
                          key={svc.id}
                          className="flex cursor-pointer items-center gap-3"
                        >
                          <Checkbox
                            checked={selected.includes(svc.id)}
                            onCheckedChange={(checked) =>
                              setSelected((prev) =>
                                checked === true
                                  ? [...prev, svc.id]
                                  : prev.filter((id) => id !== svc.id)
                              )
                            }
                          />
                          <span className="text-sm text-ink-soft">
                            {svc.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={submitting} onClick={handleSave}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamMemberRow({ member }: { member: StaffMember }) {
  const { serviceById, locationById } = useData();
  const [editorOpen, setEditorOpen] = React.useState(false);

  const capabilityLabel =
    member.serviceIds.length === 0
      ? "All services"
      : member.serviceIds
          .map((id) => serviceById.get(id)?.name)
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
      <Avatar className="size-11">
        <AvatarFallback
          className="text-xs font-medium"
          style={{ backgroundColor: `${member.color}1f`, color: member.color }}
        >
          {member.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink">{member.name}</p>
          <EmploymentBadge type={member.employmentType} />
          {member.locations.map((id) => (
            <Badge
              key={id}
              variant="outline"
              className="rounded-full border-line bg-ivory px-2.5 py-0.5 text-[11px] font-normal text-muted-warm"
            >
              {locationById.get(id)?.shortName ?? id}
            </Badge>
          ))}
        </div>
        <p className="text-xs font-light text-muted-warm">
          {member.role} ·{" "}
          {member.bookable ? "Takes appointments" : "Not bookable"}
        </p>
        {member.bookable && (
          <p className="mt-1 truncate text-xs font-light text-ink-soft">
            <span className="text-muted-warm">Performs:</span>{" "}
            {capabilityLabel}
          </p>
        )}
      </div>
      {member.bookable && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setEditorOpen(true)}
        >
          <Pencil data-icon="inline-start" strokeWidth={1.75} />
          Edit services
        </Button>
      )}

      <CapabilitiesDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        member={member}
      />
    </div>
  );
}

export function TeamSection() {
  const { allStaff } = useData();

  return (
    <Card className="max-w-3xl border-line bg-white shadow-xs">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-medium">
          Team
        </CardTitle>
        <p className="text-xs font-light text-muted-warm">
          Who works here, and what each provider can be booked for.
        </p>
      </CardHeader>
      <CardContent>
        {allStaff.length === 0 && (
          <p className="py-8 text-center text-sm font-light text-muted-warm">
            No team members yet.
          </p>
        )}
        <div className="divide-y divide-line/70">
          {allStaff.map((s) => (
            <TeamMemberRow key={s.id} member={s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
