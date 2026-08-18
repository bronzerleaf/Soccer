"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function removeRosterPostAsAdmin(postId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("roster_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/roster-posts");
}
