"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function dismissFlag(flagId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("message_flags")
    .delete()
    .eq("id", flagId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/messages");
}
