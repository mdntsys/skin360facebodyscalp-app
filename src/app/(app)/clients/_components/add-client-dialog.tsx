"use client";

import * as React from "react";
import { formatISO } from "date-fns";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  locations,
  type Client,
  type ClientTag,
  type LocationId,
} from "@/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLIENT_TAGS } from "./tag-badge";

const inputClass =
  "h-10 rounded-full border-line bg-ivory/50 focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function AddClientDialog({
  onAdd,
}: {
  onAdd: (client: Client) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [homeLocation, setHomeLocation] = React.useState<LocationId>("toluca");
  const [tags, setTags] = React.useState<ClientTag[]>([]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setHomeLocation("toluca");
    setTags([]);
  };

  const toggleTag = (tag: ClientTag) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error("A first and last name are required");
      return;
    }
    onAdd({
      id: `cl-local-${Date.now()}`,
      firstName: first,
      lastName: last,
      email: email.trim(),
      phone: phone.trim(),
      tags,
      homeLocation,
      joinedISO: formatISO(new Date(), { representation: "date" }),
      lastVisitISO: null,
      totalSpent: 0,
      visitCount: 0,
    });
    toast.success(`${first} ${last} added to your client list`);
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus data-icon="inline-start" strokeWidth={1.75} />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:max-w-lg sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            New Client
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Add someone to your book — you can complete their profile later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-first-name" className={labelClass}>
                First Name
              </Label>
              <Input
                id="client-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ava"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-last-name" className={labelClass}>
                Last Name
              </Label>
              <Input
                id="client-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Laurent"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className={labelClass}>
              Email
            </Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ava@example.com"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-phone" className={labelClass}>
                Phone
              </Label>
              <Input
                id="client-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(818) 555-0000"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelClass}>Home Location</Label>
              <Select
                value={homeLocation}
                onValueChange={(v) => setHomeLocation(v as LocationId)}
              >
                <SelectTrigger className="w-full rounded-full border-line bg-ivory/50 px-4 text-sm data-[size=default]:h-10">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-line bg-white">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className={labelClass}>Tags</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {CLIENT_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="flex cursor-pointer items-center gap-2.5 text-sm font-light text-ink-soft"
                >
                  <Checkbox
                    checked={tags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                    className="rounded-[6px] border-gold-300"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
