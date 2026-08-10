"use client";

// Customer booking flow: service -> girl -> time -> details -> confirmed.
// All availability comes from /api/booking/* which runs the app's own
// scheduling engine (rooms + real schedules); times are salon-local (Pacific).

import * as React from "react";

const TZ = "America/Los_Angeles";

interface PublicService {
  variationId: string;
  name: string;
  durationMin: number;
  priceCents: number | null;
  category: string;
  teamMemberIds: string[];
}

interface PublicStaff {
  id: string;
  name: string;
}

interface Slot {
  startAt: string;
  teamMemberId: string;
  serviceVariationVersion?: number;
}

type Step = "service" | "staff" | "time" | "details" | "done";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});
const longFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function price(cents: number | null): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

const cardClass =
  "rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(43,39,35,0.04)]";
const buttonClass =
  "w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-ivory transition hover:bg-ink-soft disabled:opacity-40";
const fieldClass =
  "h-11 w-full rounded-full border border-line bg-ivory/50 px-4 text-sm text-ink outline-none focus:border-gold-300";

export function BookingFlow() {
  const [step, setStep] = React.useState<Step>("service");
  const [services, setServices] = React.useState<PublicService[]>([]);
  const [staff, setStaff] = React.useState<PublicStaff[]>([]);
  const [loadError, setLoadError] = React.useState(false);

  const [service, setService] = React.useState<PublicService | null>(null);
  const [staffChoice, setStaffChoice] = React.useState<string | "any">("any");
  const [slots, setSlots] = React.useState<Slot[] | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);

  const [givenName, setGivenName] = React.useState("");
  const [familyName, setFamilyName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState<{ startAt: string } | null>(
    null
  );

  React.useEffect(() => {
    fetch("/api/booking/services")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { services: PublicService[]; staff: PublicStaff[] }) => {
        setServices(data.services);
        setStaff(data.staff);
      })
      .catch(() => setLoadError(true));
  }, []);

  React.useEffect(() => {
    if (step !== "time" || !service) return;
    setSlots(null);
    const params = new URLSearchParams({
      service: service.variationId,
      start: new Date().toISOString(),
    });
    if (staffChoice !== "any") params.set("staff", staffChoice);
    fetch(`/api/booking/availability?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { slots: Slot[] }) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [step, service, staffChoice]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceVariationId: service.variationId,
          serviceVariationVersion: slot.serviceVariationVersion,
          teamMemberId: slot.teamMemberId,
          startAt: slot.startAt,
          note,
          customer: { givenName, familyName, email, phone },
        }),
      });
      const data = (await res.json()) as { startAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setConfirmed({ startAt: data.startAt ?? slot.startAt });
      setStep("done");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className={`${cardClass} text-center text-sm text-muted-warm`}>
        Online booking is unavailable right now. Please call us and we&apos;ll
        get you scheduled.
      </div>
    );
  }

  // ---- Step: confirmation ---------------------------------------------------
  if (step === "done" && confirmed && service) {
    const staffName =
      staff.find((s) => s.id === slot?.teamMemberId)?.name ?? "our team";
    return (
      <div className={`${cardClass} text-center`}>
        <p className="font-heading text-3xl text-ink">You&apos;re booked!</p>
        <p className="mt-4 text-sm text-ink-soft">
          {service.name}
          <br />
          {longFormat.format(new Date(confirmed.startAt))} with {staffName}
        </p>
        <p className="mt-4 text-sm font-light text-muted-warm">
          A confirmation is on its way to {email}. We can&apos;t wait to see
          you.
        </p>
      </div>
    );
  }

  // ---- Step: pick a service -------------------------------------------------
  if (step === "service") {
    if (services.length === 0) {
      return (
        <div className={`${cardClass} text-center text-sm text-muted-warm`}>
          Loading services…
        </div>
      );
    }
    const categories = [...new Set(services.map((s) => s.category))];
    return (
      <div className="space-y-6">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="mb-2 px-2 text-xs tracking-wide uppercase text-muted-warm">
              {category}
            </h2>
            <div className="overflow-hidden rounded-3xl border border-line bg-white">
              {services
                .filter((s) => s.category === category)
                .map((s, i, arr) => (
                  <button
                    key={s.variationId}
                    type="button"
                    onClick={() => {
                      setService(s);
                      setStaffChoice("any");
                      setSlot(null);
                      setStep("staff");
                    }}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-cream ${
                      i < arr.length - 1 ? "border-b border-line" : ""
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {s.name}
                      </span>
                      <span className="block text-xs font-light text-muted-warm">
                        {s.durationMin} min
                      </span>
                    </span>
                    <span className="text-sm text-ink-soft">
                      {price(s.priceCents)}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (!service) return null;

  const performers = staff.filter((s) =>
    service.teamMemberIds.includes(s.id)
  );

  // ---- Step: pick a girl ----------------------------------------------------
  if (step === "staff") {
    return (
      <div className="space-y-4">
        <BackBar
          label={service.name}
          onBack={() => setStep("service")}
        />
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          {[{ id: "any" as const, name: "First available" }, ...performers].map(
            (s, i, arr) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStaffChoice(s.id);
                  setSlot(null);
                  setStep("time");
                }}
                className={`flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-cream ${
                  i < arr.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="text-sm font-medium text-ink">{s.name}</span>
                <span className="text-xs text-muted-warm">›</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  // ---- Step: pick a time ----------------------------------------------------
  if (step === "time") {
    const byDay = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const key = dayKeyFormat.format(new Date(s.startAt));
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return (
      <div className="space-y-4">
        <BackBar
          label={`${service.name} · ${
            staffChoice === "any"
              ? "First available"
              : staff.find((s) => s.id === staffChoice)?.name
          }`}
          onBack={() => setStep("staff")}
        />
        {slots === null ? (
          <div className={`${cardClass} text-center text-sm text-muted-warm`}>
            Finding open times…
          </div>
        ) : byDay.size === 0 ? (
          <div className={`${cardClass} text-center text-sm text-muted-warm`}>
            No openings in the next week. Try another girl, or call us — we may
            fit you in.
          </div>
        ) : (
          [...byDay.entries()].map(([day, daySlots]) => (
            <section key={day}>
              <h3 className="mb-2 px-2 text-xs tracking-wide uppercase text-muted-warm">
                {dayLabelFormat.format(new Date(daySlots[0].startAt))}
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {daySlots.map((s) => (
                  <button
                    key={`${s.startAt}-${s.teamMemberId}`}
                    type="button"
                    onClick={() => {
                      setSlot(s);
                      setStep("details");
                    }}
                    className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink transition hover:border-gold-300 hover:bg-gold-50"
                  >
                    {timeFormat.format(new Date(s.startAt))}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    );
  }

  // ---- Step: details --------------------------------------------------------
  if (step === "details" && slot) {
    const staffName =
      staff.find((s) => s.id === slot.teamMemberId)?.name ?? "our team";
    return (
      <div className="space-y-4">
        <BackBar
          label={`${longFormat.format(new Date(slot.startAt))} · ${staffName}`}
          onBack={() => setStep("time")}
        />
        <form onSubmit={submit} className={`${cardClass} space-y-4`}>
          <div className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
            {service.name} · {service.durationMin} min ·{" "}
            {price(service.priceCents)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="First name *"
              className={fieldClass}
            />
            <input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Last name"
              className={fieldClass}
            />
          </div>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email *"
            className={fieldClass}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={fieldClass}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything we should know? (optional)"
            rows={2}
            className="w-full rounded-2xl border border-line bg-ivory/50 px-4 py-3 text-sm text-ink outline-none focus:border-gold-300"
          />
          {submitError && (
            <p className="text-sm text-red-700">{submitError}</p>
          )}
          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Booking…" : "Confirm Booking"}
          </button>
        </form>
      </div>
    );
  }

  return null;
}

function BackBar({ label, onBack }: { label?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-line bg-white px-3 py-1 text-sm text-ink-soft transition hover:bg-cream"
      >
        ‹ Back
      </button>
      <span className="truncate text-sm font-light text-muted-warm">
        {label}
      </span>
    </div>
  );
}
