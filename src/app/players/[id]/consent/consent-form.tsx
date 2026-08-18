"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import { confirmConsent } from "./actions";

function Form({
  playerId,
  clientSecret,
}: {
  playerId: string;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setError(null);
    setSubmitting(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setSubmitting(false);
      return;
    }

    const { paymentIntent, error: stripeError } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

    if (stripeError || !paymentIntent) {
      setError(stripeError?.message ?? "Card authorization failed.");
      setSubmitting(false);
      return;
    }

    try {
      await confirmConsent(playerId, paymentIntent.id);
      router.push(`/players/${playerId}`);
      router.refresh();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Something went wrong confirming consent."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-300 px-3 py-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: "14px", color: "#0f172a" },
            },
          }}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Verifying..." : "Verify and activate profile"}
      </button>
    </form>
  );
}

export function ConsentForm({
  playerId,
  clientSecret,
}: {
  playerId: string;
  clientSecret: string;
}) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret }}>
      <Form playerId={playerId} clientSecret={clientSecret} />
    </Elements>
  );
}
