"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function removeFeedPostAsAdmin(postId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("feed_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/feed-posts");
}
