import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses RLS entirely. Only ever call this from a "use server" action
// or route handler, never from client code — it exists for exactly one
// thing right now: the server-side consent flow flipping
// players.consent_completed and writing consent_records after a verified
// Stripe authorization, neither of which a parent's own authenticated
// session is allowed to do directly.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
