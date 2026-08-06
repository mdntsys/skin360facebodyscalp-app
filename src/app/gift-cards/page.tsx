import { notFound } from "next/navigation";

import { bookingSurfaceEnabled } from "@/lib/square/booking-api";
import { GiftCardFlow } from "./_components/gift-card-flow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gift Cards · Skin 360 Face Body Scalp",
};

export default async function GiftCardsPage() {
  if (!(await bookingSurfaceEnabled())) notFound();

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const squareLocationId = process.env.SQUARE_LOCATION_ID;
  if (!appId || !squareLocationId) notFound();

  return (
    <main className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-gold-600">
            Skin 360 · Face Body Scalp
          </p>
          <h1 className="font-heading mt-2 text-4xl font-medium text-ink">
            Gift Cards
          </h1>
          <p className="mt-2 text-sm font-light text-muted-warm">
            Instant digital delivery · Redeemable in the studio for any service
            or product
          </p>
        </header>
        <GiftCardFlow appId={appId} squareLocationId={squareLocationId} />
      </div>
    </main>
  );
}
