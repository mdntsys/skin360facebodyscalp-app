// eGift purchase: charge the card token from the Web Payments SDK, create a
// digital gift card, activate it against that payment, email the recipient.
// If activation fails after the charge, the payment is refunded — nobody pays
// for a card that doesn't exist.

import { sendEmail } from "../email/send";
import { square, SquareApiError } from "./client";

const MIN_CENTS = 25_00;
const MAX_CENTS = 1_000_00;

function locationId(): string {
  const id = process.env.SQUARE_LOCATION_ID;
  if (!id) throw new Error("Missing SQUARE_LOCATION_ID env var");
  return id;
}

export interface GiftCardPurchase {
  sourceToken: string; // cnon:... from the Web Payments SDK
  amountCents: number;
  purchaser: { name: string; email: string };
  recipient?: { name?: string; email?: string; message?: string };
}

export interface GiftCardResult {
  gan: string;
  amountCents: number;
  emailSent: boolean;
  recipientEmail: string;
}

function formatGan(gan: string): string {
  return gan.replace(/(.{4})/g, "$1 ").trim();
}

function giftEmailHtml(args: {
  recipientName: string;
  purchaserName: string;
  amountCents: number;
  gan: string;
  message?: string;
}): string {
  const amount = `$${(args.amountCents / 100).toFixed(2)}`;
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360 · FACE BODY SCALP</p>
    <h1 style="text-align:center;font-weight:500">A gift for you${args.recipientName ? `, ${args.recipientName}` : ""}</h1>
    <p style="text-align:center">${args.purchaserName} sent you a ${amount} gift card.</p>
    ${args.message ? `<p style="text-align:center;font-style:italic">“${args.message}”</p>` : ""}
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff;text-align:center">
      <p style="margin:0;font-size:12px;color:#837a6d">GIFT CARD NUMBER</p>
      <p style="margin:8px 0 0;font-size:22px;letter-spacing:2px">${formatGan(args.gan)}</p>
      <p style="margin:8px 0 0;font-size:14px">Balance: ${amount}</p>
    </div>
    <p style="text-align:center;font-size:13px;color:#837a6d">
      Show this number at the front desk — it works for any service or product.<br/>
      Skin 360, 24510 Town Center Dr Suite 170, Valencia CA
    </p>
  </div>`;
}

export async function purchaseGiftCard(
  args: GiftCardPurchase
): Promise<GiftCardResult> {
  if (
    !Number.isInteger(args.amountCents) ||
    args.amountCents < MIN_CENTS ||
    args.amountCents > MAX_CENTS
  ) {
    throw new Error(
      `Gift card amount must be between $${MIN_CENTS / 100} and $${MAX_CENTS / 100}.`
    );
  }

  // 1. Charge the buyer.
  const payment = await square<{ payment?: { id: string; status: string } }>(
    "POST",
    "/v2/payments",
    {
      idempotency_key: crypto.randomUUID(),
      source_id: args.sourceToken,
      amount_money: { amount: args.amountCents, currency: "USD" },
      location_id: locationId(),
      buyer_email_address: args.purchaser.email,
      note: "Skin 360 eGift card",
    }
  );
  const paymentId = payment.payment?.id;
  if (!paymentId) throw new Error("Payment failed");

  try {
    // 2. Create + activate the digital card.
    const card = await square<{ gift_card?: { id: string; gan?: string } }>(
      "POST",
      "/v2/gift-cards",
      {
        idempotency_key: crypto.randomUUID(),
        location_id: locationId(),
        gift_card: { type: "DIGITAL" },
      }
    );
    const giftCardId = card.gift_card?.id;
    if (!giftCardId) throw new Error("Could not create gift card");

    const activation = await square<{
      gift_card_activity?: { gift_card_gan?: string };
    }>("POST", "/v2/gift-cards/activities", {
      idempotency_key: crypto.randomUUID(),
      gift_card_activity: {
        type: "ACTIVATE",
        location_id: locationId(),
        gift_card_id: giftCardId,
        activate_activity_details: {
          amount_money: { amount: args.amountCents, currency: "USD" },
          buyer_payment_instrument_ids: [paymentId],
        },
      },
    });
    const gan = activation.gift_card_activity?.gift_card_gan ?? card.gift_card?.gan;
    if (!gan) throw new Error("Gift card did not activate");

    // 3. Deliver.
    const recipientEmail = args.recipient?.email?.trim() || args.purchaser.email;
    const { sent } = await sendEmail({
      to: recipientEmail,
      subject: `A Skin 360 gift card from ${args.purchaser.name}`,
      html: giftEmailHtml({
        recipientName: args.recipient?.name?.trim() ?? "",
        purchaserName: args.purchaser.name,
        amountCents: args.amountCents,
        gan,
        message: args.recipient?.message?.trim() || undefined,
      }),
    });

    return {
      gan,
      amountCents: args.amountCents,
      emailSent: sent,
      recipientEmail,
    };
  } catch (err) {
    // The buyer was charged but got no card — undo the charge.
    try {
      await square("POST", "/v2/refunds", {
        idempotency_key: crypto.randomUUID(),
        payment_id: paymentId,
        amount_money: { amount: args.amountCents, currency: "USD" },
        reason: "Gift card activation failed",
      });
    } catch (refundErr) {
      console.error(
        "CRITICAL: gift card activation AND refund failed for payment",
        paymentId,
        refundErr
      );
    }
    if (err instanceof SquareApiError) {
      console.error("gift card activation failed:", err.message);
      throw new Error("We couldn't issue the gift card. Your card was not charged.");
    }
    throw err;
  }
}
