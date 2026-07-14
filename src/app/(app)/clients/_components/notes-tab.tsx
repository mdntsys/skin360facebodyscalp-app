"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2, NotebookPen, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { useData, type Client } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "./empty-state";

export function NotesTab({ client }: { client: Client }) {
  const { clientNotes, staffById, addClientNote } = useData();
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const notes = clientNotes
    .filter((n) => n.clientId === client.id)
    .sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    );

  const saveNote = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      await addClientNote(client.id, text);
      setDraft("");
      toast.success("Note saved");
    } catch (err) {
      toast.error("Couldn't save the note", {
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card className="border-line bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium">
            Add a Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Treatment observations, preferences, follow-ups for ${client.firstName}…`}
            className="min-h-24 rounded-xl border-line bg-ivory/50 text-sm focus-visible:border-gold-300"
          />
          <div className="flex justify-end">
            <Button onClick={saveNote} disabled={saving || !draft.trim()}>
              {saving ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <NotebookPen data-icon="inline-start" strokeWidth={1.75} />
              )}
              {saving ? "Saving…" : "Save Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description={`Notes about ${client.firstName}'s skin, preferences and follow-ups will appear here.`}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase">
            Note History
          </p>
          <div className="space-y-4">
            {notes.map((n) => {
              const author = staffById.get(n.authorStaffId);
              return (
                <div
                  key={n.id}
                  className="rounded-2xl border-l-2 border-gold-300 bg-cream/80 px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-xs font-normal tracking-wide text-gold-700">
                      {author?.name ?? "Skin 360 Team"}
                    </p>
                    <p className="text-xs font-light text-muted-warm">
                      {format(new Date(n.dateISO), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed font-light text-ink-soft">
                    {n.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
