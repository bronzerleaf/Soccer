import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves a parent-entered team name to a team_id, creating the team on
// the fly if no exact match exists yet -- same spirit as picking a club
// from the curated dropdown, except teams aren't curated: any parent can
// start one, and a coach later claims/verifies it (see
// supabase/migrations/20260113000000_teams.sql). Runs under the caller's
// own RLS session, so this only ever does what the "any authenticated
// user reads" / "authenticated user creates" team policies already allow.
//
// If the matched team was folded into another one via
// merge_unclaimed_team_into(), follows merged_into_team_id to the team
// that's actually still active.
export async function findOrCreateTeam(
  supabase: SupabaseClient,
  name: string,
  createdBy: string
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: matches } = await supabase
    .from("teams")
    .select("id, merged_into_team_id")
    .eq("name", trimmed)
    .order("created_at", { ascending: true })
    .limit(1);

  const existing = matches?.[0];

  if (existing) {
    let teamId = existing.id as string;
    let mergedInto = existing.merged_into_team_id as string | null;
    let hops = 0;
    while (mergedInto && hops < 5) {
      const { data: next } = await supabase
        .from("teams")
        .select("id, merged_into_team_id")
        .eq("id", mergedInto)
        .maybeSingle();
      if (!next) break;
      teamId = next.id as string;
      mergedInto = next.merged_into_team_id as string | null;
      hops += 1;
    }
    return teamId;
  }

  const { data: created, error } = await supabase
    .from("teams")
    .insert({ name: trimmed, created_by: createdBy })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Could not save this team.");
  }

  return created.id as string;
}
