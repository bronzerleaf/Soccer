import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveCoachVerification, rejectCoachVerification } from "./actions";

export default async function AdminCoachesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: pending } = await supabase
    .from("coach_verifications")
    .select(
      "id, evidence, created_at, coach:profiles!coach_verifications_coach_id_fkey(full_name, email), club:clubs(name, city)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">
        Coach verification queue
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Approve a coach only once you can confirm their club affiliation.
      </p>

      {pending && pending.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {pending.map((item) => {
            const coach = item.coach as unknown as {
              full_name: string;
              email: string;
            } | null;
            const club = item.club as unknown as {
              name: string;
              city: string;
            } | null;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-900">
                  {coach?.full_name} · {coach?.email}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Claims: {club?.name} — {club?.city}
                </p>
                <p className="mt-2 text-sm text-slate-700">{item.evidence}</p>

                <div className="mt-3 flex gap-2">
                  <form action={approveCoachVerification.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectCoachVerification.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-slate-600">
          No pending verifications right now.
        </p>
      )}
    </main>
  );
}
