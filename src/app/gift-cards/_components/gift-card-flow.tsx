"use client";

// eGift purchase flow with Square's embedded card form (Web Payments SDK).
// The buyer never leaves this page; the server charges the token, activates a
// real Square gift card, and emails the recipient. The code is also shown
// on-screen so delivery never depends on email alone.

import * as React from "react";

interface SquareCard {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message?: string }>;
  }>;
}

interface SquarePayments {
  card(): Promise<SquareCard>;
}

declare global {
  interface Window {
    Square?: {
      payments(appId: string, locationId: string): Promise<SquarePayments>;
    };
  }
}

const AMOUNTS = [50_00, 100_00, 150_00, 200_00];

const cardClass =
  "rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(43,39,35,0.04)]";
const fieldClass =
  "h-11 w-full rounded-full border border-line bg-ivory/50 px-4 text-sm text-ink outline-none focus:border-gold-300";
const buttonClass =
  "w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-ivory transition hover:bg-ink-soft disabled:opacity-40";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function GiftCardFlow({
  appId,
  squareLocationId,
}: {
  appId: string;
  squareLocationId: string;
}) {
  const [amount, setAmount] = React.useState<number>(100_00);
  const [customAmount, setCustomAmount] = React.useState("");
  const [isCustom, setIsCustom] = React.useState(false);

  const [purchaserName, setPurchaserName] = React.useState("");
  const [purchaserEmail, setPurchaserEmail] = React.useState("");
  const [forSomeoneElse, setForSomeoneElse] = React.useState(false);
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [cardReady, setCardReady] = React.useState(false);
  const [cardError, setCardError] = React.useState(false);
  const cardRef = React.useRef<SquareCard | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    gan: string;
    amountCents: number;
    emailSent: boolean;
    recipientEmail: string;
  } | null>(null);

  // Load the Web Payments SDK and attach the card field.
  React.useEffect(() => {
    const src = appId.startsWith("sandbox-")
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";

    let cancelled = false;
    async function init() {
      try {
        if (!window.Square) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("SDK failed to load"));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !window.Square) return;
        const payments = await window.Square.payments(appId, squareLocationId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#gift-card-payment");
        cardRef.current = card;
        setCardReady(true);
      } catch (err) {
        console.error("Web Payments SDK init failed:", err);
        setCardError(true);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [appId, squareLocationId]);

  const effectiveAmount = isCustom
    ? Math.round(Number(customAmount) * 100) || 0
    : amount;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardRef.current) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        throw new Error(
          tokenResult.errors?.[0]?.message ?? "Please check your card details."
        );
      }
      const res = await fetch("/api/gift-cards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceToken: tokenResult.token,
          amountCents: effectiveAmount,
          purchaser: { name: purchaserName, email: purchaserEmail },
          recipient: forSomeoneElse
            ? { name: recipientName, email: recipientEmail, message }
            : undefined,
        }),
      });
      const data = (await res.json()) as
        | { gan: string; amountCents: number; emailSent: boolean; recipientEmail: string }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Something went wrong.");
      }
      setResult(data);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className={`${cardClass} text-center`}>
        <p className="font-heading text-3xl text-ink">
          {money(result.amountCents)} gift card issued
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-line bg-cream px-4 py-5">
          <p className="text-xs tracking-wide uppercase text-muted-warm">
            Gift card number
          </p>
          <p className="mt-2 text-xl tracking-[0.15em] text-ink">
            {result.gan.replace(/(.{4})/g, "$1 ").trim()}
          </p>
        </div>
        <p className="mt-4 text-sm font-light text-muted-warm">
          {result.emailSent
            ? `We emailed it to ${result.recipientEmail}.`
            : "Save this number — show it at the front desk to redeem."}
        </p>
      </div>
    );
  }

  if (cardError) {
    return (
      <div className={`${cardClass} text-center text-sm text-muted-warm`}>
        The payment form couldn&apos;t load. Please refresh the page, or call
        us and we&apos;ll take care of it.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className={cardClass}>
        <h2 className="mb-3 text-xs tracking-wide uppercase text-muted-warm">
          Amount
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAmount(a);
                setIsCustom(false);
              }}
              className={`rounded-full border px-2 py-2 text-sm transition ${
                !isCustom && amount === a
                  ? "border-gold-400 bg-gold-50 text-ink"
                  : "border-line bg-white text-ink-soft hover:border-gold-200"
              }`}
            >
              {money(a)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`rounded-full border px-2 py-2 text-sm transition ${
              isCustom
                ? "border-gold-400 bg-gold-50 text-ink"
                : "border-line bg-white text-ink-soft hover:border-gold-200"
            }`}
          >
            Other
          </button>
        </div>
        {isCustom && (
          <div className="relative mt-3">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-warm">
              $
            </span>
            <input
              type="number"
              min={25}
              max={1000}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="25 – 1000"
              className={`${fieldClass} pl-8`}
            />
          </div>
        )}
      </section>

      <section className={`${cardClass} space-y-3`}>
        <h2 className="text-xs tracking-wide uppercase text-muted-warm">
          Your details
        </h2>
        <input
          required
          value={purchaserName}
          onChange={(e) => setPurchaserName(e.target.value)}
          placeholder="Your name *"
          className={fieldClass}
        />
        <input
          required
          type="email"
          value={purchaserEmail}
          onChange={(e) => setPurchaserEmail(e.target.value)}
          placeholder="Your email *"
          className={fieldClass}
        />
        <label className="flex items-center gap-2 px-1 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={forSomeoneElse}
            onChange={(e) => setForSomeoneElse(e.target.checked)}
            className="h-4 w-4 accent-[#c19a43]"
          />
          This is a gift for someone else
        </label>
        {forSomeoneElse && (
          <div className="space-y-3">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Recipient's name"
              className={fieldClass}
            />
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Recipient's email (we send the gift card there)"
              className={fieldClass}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A short message (optional)"
              rows={2}
              className="w-full rounded-2xl border border-line bg-ivory/50 px-4 py-3 text-sm text-ink outline-none focus:border-gold-300"
            />
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-xs tracking-wide uppercase text-muted-warm">
          Payment
        </h2>
        <div id="gift-card-payment" />
        {!cardReady && (
          <p className="text-sm font-light text-muted-warm">
            Loading secure payment form…
          </p>
        )}
      </section>

      {submitError && (
        <p className="px-2 text-sm text-red-700">{submitError}</p>
      )}
      <button
        type="submit"
        disabled={
          !cardReady ||
          submitting ||
          effectiveAmount < 25_00 ||
          effectiveAmount > 1_000_00
        }
        className={buttonClass}
      >
        {submitting
          ? "Processing…"
          : `Buy ${money(effectiveAmount || 0)} Gift Card`}
      </button>
      <p className="text-center text-xs font-light text-muted-warm">
        Payments are processed securely by Square.
      </p>
    </form>
  );
}
