"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function expressOpportunityInterest(
  kind: "roster" | "feed",
  targetId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const playerId = String(formData.get("player_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!playerId) throw new Error("Choose which player is interested.");

  const targetColumn = kind === "roster" ? "roster_post_id" : "feed_post_id";
  const { data: existing } = await supabase
    .from("opportunity_interests")
    .select("id")
    .eq("parent_id", userData.user.id)
    .eq("player_id", playerId)
    .eq(targetColumn, targetId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("opportunity_interests").insert({
      parent_id: userData.user.id,
      player_id: playerId,
      roster_post_id: kind === "roster" ? targetId : null,
      feed_post_id: kind === "feed" ? targetId : null,
      note: note || null,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(kind === "roster" ? `/roster-posts/${targetId}` : `/feed/post/${targetId}`);
}

export async function removeOpportunityInterest(
  kind: "roster" | "feed",
  targetId: string,
  interestId: string
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase.from("opportunity_interests").delete().eq("id", interestId);
  if (error) throw new Error(error.message);

  revalidatePath(kind === "roster" ? `/roster-posts/${targetId}` : `/feed/post/${targetId}`);
}
