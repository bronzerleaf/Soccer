"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CONSENT_AUTHORIZATION_AMOUNT_CENTS,
  CONSENT_AUTHORIZATION_CURRENCY,
  createStripeClient,
} from "@/lib/stripe/server";

async function requireOwnUnconsentedPlayer(playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  // RLS already scopes this to players the signed-in parent owns; a
  // missing row here means either it doesn't exist or isn't theirs, and
  // either way there's nothing more to say than "not found."
  const { data: player } = await supabase
    .from("players")
    .select("id, consent_completed")
    .eq("id", playerId)
    .single();

  if (!player) {
    throw new Error("Player not found.");
  }

  return { supabase, user: userData.user, player };
}

// Creates the $0.50 authorization-only PaymentIntent a parent confirms
// client-side with their card. capture_method: "manual" means Stripe
// authorizes and holds the card without ever moving money; we cancel it
// (never capture) the moment confirmConsent verifies it succeeded.
export async function createConsentIntent(playerId: string) {
  const { user, player } = await requireOwnUnconsentedPlayer(playerId);

  if (player.consent_completed) {
    throw new Error("This player already has parental consent on file.");
  }

  const stripe = createStripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: CONSENT_AUTHORIZATION_AMOUNT_CENTS,
    currency: CONSENT_AUTHORIZATION_CURRENCY,
    capture_method: "manual",
    payment_method_types: ["card"],
    description: "OpenRoster parental identity verification (not charged)",
    metadata: { player_id: playerId, parent_id: user.id },
  });

  return { clientSecret: intent.client_secret };
}

// Called after the client has confirmed the card with Stripe. Never trust
// the client's word alone that the authorization succeeded — re-fetch the
// PaymentIntent from Stripe and check its actual status, amount, and
// metadata before treating consent as verified.
export async function confirmConsent(playerId: string, paymentIntentId: string) {
  const { user, player } = await requireOwnUnconsentedPlayer(playerId);

  if (player.consent_completed) {
    return { alreadyConsented: true as const };
  }

  const stripe = createStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const isValid =
    intent.status === "requires_capture" &&
    intent.amount === CONSENT_AUTHORIZATION_AMOUNT_CENTS &&
    intent.currency === CONSENT_AUTHORIZATION_CURRENCY &&
    intent.metadata.player_id === playerId &&
    intent.metadata.parent_id === user.id;

  if (!isValid) {
    throw new Error(
      "We couldn't verify that card authorization. Please try again."
    );
  }

  // Void the hold — this is never captured, so no money ever moves.
  await stripe.paymentIntents.cancel(paymentIntentId);

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "0.0.0.0";

  const serviceRole = createServiceRoleClient();

  const { error: consentError } = await serviceRole
    .from("consent_records")
    .insert({
      player_id: playerId,
      parent_id: user.id,
      method: "stripe_card_authorization",
      ip,
    });

  if (consentError) {
    throw new Error("Could not record consent. Please try again.");
  }

  const { error: playerError } = await serviceRole
    .from("players")
    .update({ consent_completed: true })
    .eq("id", playerId);

  if (playerError) {
    throw new Error("Could not activate the player profile. Please try again.");
  }

  return { alreadyConsented: false as const };
}
