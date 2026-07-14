"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Search, Users } from "lucide-react";

import { useData, type Client, type ClientTag } from "@/data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddClientDialog } from "./_components/add-client-dialog";
import { ClientAvatar } from "./_components/client-avatar";
import { EmptyState } from "./_components/empty-state";
import { CLIENT_TAGS, TagBadge } from "./_components/tag-badge";

type TagFilter = "All" | ClientTag;

const TAG_FILTERS: TagFilter[] = ["All", ...CLIENT_TAGS];

const headClass =
  "h-11 text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase";

export default function ClientsPage() {
  const router = useRouter();
  const { clients, members } = useData();
  const [search, setSearch] = React.useState("");
  const [tag, setTag] = React.useState<TagFilter>("All");

  const allClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );

  const q = search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const filtered = allClients.filter((c) => {
    if (tag !== "All" && !c.tags.includes(tag)) return false;
    if (!q) return true;
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    if (name.includes(q) || c.email.toLowerCase().includes(q)) return true;
    return qDigits.length > 0 && c.phone.replace(/\D/g, "").includes(qDigits);
  });

  const lastVisitLabel = (c: Client) =>
    c.lastVisitISO ? format(new Date(c.lastVisitISO), "MMM d") : "—";

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${allClients.length} clients · ${members.length} members`}
        actions={
          <AddClientDialog onCreated={(c) => router.push(`/clients/${c.id}`)} />
        }
      />

      {/* Toolbar */}
      <div className="mb-5 space-y-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-warm"
            strokeWidth={1.75}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            className="h-10 rounded-full border-line bg-white pl-11 focus-visible:border-gold-300"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <div className="flex w-max gap-2 pb-1">
            {TAG_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-4 text-xs font-normal tracking-wide transition-colors",
                  tag === t
                    ? "border-gold-300 bg-gold-50 text-gold-700"
                    : "border-line bg-white text-ink-soft hover:border-gold-200 hover:bg-cream/60"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {allClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Your book is a blank page — use “Add Client” above to welcome your first."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description="Try a different search or filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setTag("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden border-line bg-white py-0 shadow-xs lg:block">
            <Table>
              <TableHeader>
                <TableRow className="border-line hover:bg-transparent">
                  <TableHead className={`${headClass} px-5`}>Client</TableHead>
                  <TableHead className={headClass}>Phone</TableHead>
                  <TableHead className={headClass}>Email</TableHead>
                  <TableHead className={headClass}>Last Visit</TableHead>
                  <TableHead className={headClass}>Tags</TableHead>
                  <TableHead className={`${headClass} w-12 px-5`}>
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="cursor-pointer border-line transition-colors hover:bg-cream/50"
                  >
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar
                          firstName={c.firstName}
                          lastName={c.lastName}
                        />
                        <span className="text-sm text-ink">
                          {c.firstName} {c.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm font-light text-ink-soft">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-light text-ink-soft">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-light text-ink-soft">
                      {lastVisitLabel(c)}
                    </TableCell>
                    <TableCell className="py-3">
                      {c.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <TagBadge key={t} tag={t} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-light text-muted-warm">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <ChevronRight
                        className="ml-auto size-4 text-muted-warm"
                        strokeWidth={1.75}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-xs transition-colors active:bg-cream/70"
              >
                <ClientAvatar
                  firstName={c.firstName}
                  lastName={c.lastName}
                  className="size-11"
                  initialsClassName="text-base"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="truncate text-xs font-light text-muted-warm">
                    {c.phone || "No phone"} · Last visit {lastVisitLabel(c)}
                  </p>
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <TagBadge key={t} tag={t} />
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-warm"
                  strokeWidth={1.75}
                />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
