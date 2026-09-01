"use client";

import * as React from "react";
import { Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

import {
  useData,
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
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_TAGS } from "./tag-badge";

const inputClass =
  "h-10 rounded-full border-line bg-ivory/50 focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

function toDateInput(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return "";
}

function saveErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/duplicate|unique/i.test(msg) && /email/i.test(msg)) {
    return "Another client already has that email.";
  }
  return msg || "Please try again in a moment.";
}

export function EditClientDialog({ client }: { client: Client }) {
  const { locations, updateClient } = useData();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [firstName, setFirstName] = React.useState(client.firstName);
  const [lastName, setLastName] = React.useState(client.lastName);
  const [email, setEmail] = React.useState(client.email);
  const [phone, setPhone] = React.useState(client.phone);
  const [homeLocation, setHomeLocation] = React.useState<LocationId>(
    client.homeLocation
  );
  const [tags, setTags] = React.useState<ClientTag[]>(client.tags);
  const [birthday, setBirthday] = React.useState(toDateInput(client.birthday));
  const [skinNotes, setSkinNotes] = React.useState(client.skinNotes ?? "");

  const seed = React.useCallback(() => {
    setFirstName(client.firstName);
    setLastName(client.lastName);
    setEmail(client.email);
    setPhone(client.phone);
    setHomeLocation(client.homeLocation);
    setTags(client.tags);
    setBirthday(toDateInput(client.birthday));
    setSkinNotes(client.skinNotes ?? "");
  }, [client]);

  const toggleTag = (tag: ClientTag) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error("A first and last name are required");
      return;
    }
    setSaving(true);
    try {
      await updateClient(client.id, {
        firstName: first,
        lastName: last,
        email: email.trim(),
        phone: phone.trim(),
        tags,
        homeLocation,
        birthday: birthday.trim() || null,
        skinNotes: skinNotes.trim() || null,
      });
      toast.success(`${first} ${last} updated`);
      setOpen(false);
    } catch (err) {
      toast.error("Couldn't save the client", {
        description: saveErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (saving) return;
        if (o) seed();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilLine data-icon="inline-start" strokeWidth={1.75} />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,44rem)] overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-sm sm:max-w-lg sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Update {client.firstName}&apos;s contact details and notes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-first-name" className={labelClass}>
                First Name
              </Label>
              <Input
                id="edit-client-first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-last-name" className={labelClass}>
                Last Name
              </Label>
              <Input
                id="edit-client-last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-email" className={labelClass}>
              Email
            </Label>
            <Input
              id="edit-client-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone" className={labelClass}>
                Phone
              </Label>
              <Input
                id="edit-client-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(818) 555-0000"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-birthday" className={labelClass}>
                Birthday
              </Label>
              <Input
                id="edit-client-birthday"
                type="date"
                autoComplete="bday"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={inputClass}
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="edit-client-skin-notes" className={labelClass}>
              Skin Notes
            </Label>
            <Textarea
              id="edit-client-skin-notes"
              value={skinNotes}
              onChange={(e) => setSkinNotes(e.target.value)}
              placeholder="Preferences, sensitivities, what works…"
              className="min-h-20 rounded-xl border-line bg-ivory/50 text-sm focus-visible:border-gold-300"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
