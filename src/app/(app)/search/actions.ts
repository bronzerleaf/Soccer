"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// A verified coach marking (or un-marking) interest in a player they can
// already see through search. Deliberately not framed as a "like" in
// the UI — see migration 15's comment for why. A single toggle, same
// pattern as toggleFeedPostLike: check server-side whether the caller
// has already marked interest and flip it.
export async function togglePlayerInterest(playerId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("player_interest")
    .select("player_id")
    .eq("player_id", playerId)
    .eq("coach_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("player_interest")
      .delete()
      .eq("player_id", playerId)
      .eq("coach_id", userData.user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("player_interest")
      .insert({ player_id: playerId, coach_id: userData.user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/search/${playerId}`);
}
