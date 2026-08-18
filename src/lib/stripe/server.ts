import Stripe from "stripe";

export function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// The nominal parental-consent authorization: $0.50, manual capture so
// it's never actually charged, and cancelled the moment we've confirmed
// the card was real — see src/app/players/[id]/consent/actions.ts.
export const CONSENT_AUTHORIZATION_AMOUNT_CENTS = 50;
export const CONSENT_AUTHORIZATION_CURRENCY = "usd";
