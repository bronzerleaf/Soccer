"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function createClub(formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const ageGroups = formData.getAll("age_groups").map(String);

  if (!name || !city) {
    throw new Error("Name and city are required.");
  }

  const { error } = await supabase.from("clubs").insert({
    name,
    city,
    age_groups: ageGroups,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/clubs");
}

export async function deleteClub(clubId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("clubs").delete().eq("id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/clubs");
}
