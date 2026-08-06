import { notFound } from "next/navigation";

import { bookingSurfaceEnabled } from "@/lib/square/booking-api";
import { BookingFlow } from "./_components/booking-flow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book an Appointment · Skin 360 Face Body Scalp",
};

export default async function BookPage() {
  if (!(await bookingSurfaceEnabled())) notFound();

  return (
    <main className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-gold-600">
            Skin 360 · Face Body Scalp
          </p>
          <h1 className="font-heading mt-2 text-4xl font-medium text-ink">
            Book an Appointment
          </h1>
          <p className="mt-2 text-sm font-light text-muted-warm">
            Valencia · 24510 Town Center Dr, Suite 170
          </p>
        </header>
        <BookingFlow />
      </div>
    </main>
  );
}
