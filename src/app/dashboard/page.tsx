import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userData.user.id)
    .single();

  const roleCopy =
    profile?.role === "coach"
      ? "Once a club affiliation is confirmed, you'll be able to search the player pool and message families about open roster spots."
      : "Next up: add a player profile and flag them open to opportunities so coaches can find them.";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="text-base font-semibold text-slate-900">
            {profile?.full_name || userData.user.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Log out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-lg border border-slate-200 p-5">
        <p className="text-sm font-medium text-slate-900">
          {profile?.role === "coach" ? "Coach account" : "Parent account"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{roleCopy}</p>
      </div>
    </main>
  );
}
