// Public send-ahead form page: the emailed/texted link lands here, the
// client fills and signs on their phone, the submission lands on their
// profile. Single-use — a completed or stale token gets a friendly notice.

import type { Metadata } from "next";

import { getPublicFormRequest } from "@/lib/forms/public-form";
import { FillClient } from "./fill-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Form — Skin 360",
  robots: { index: false, follow: false },
};

function Notice({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs tracking-[0.3em] text-gold-600 uppercase">
        Skin 360 · Face Body Scalp
      </p>
      <h1 className="mt-6 font-heading text-3xl text-ink">{heading}</h1>
      <p className="mt-4 text-sm font-light text-muted-warm">{body}</p>
    </div>
  );
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = await getPublicFormRequest(token);

  if (request.status === "invalid") {
    return (
      <Notice
        heading="This link isn't active"
        body="This form link is no longer valid. Please call us or ask for a new link at your next visit."
      />
    );
  }
  if (request.status === "completed") {
    return (
      <Notice
        heading="You're all set"
        body="This form was already filled out and signed — there's nothing else to do. We can't wait to see you."
      />
    );
  }

  return (
    <FillClient
      token={token}
      firstName={request.firstName}
      template={request.template}
    />
  );
}
