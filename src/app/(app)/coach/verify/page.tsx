import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "./verify-form";

export default async function CoachVerifyPage() {
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

  if (profile?.role !== "coach") {
    redirect("/dashboard");
  }

  const [{ data: verification }, { data: clubs }] = await Promise.all([
    supabase
      .from("coach_verifications")
      .select("status, claimed_club_id, clubs(name, city)")
      .eq("coach_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("clubs").select("id, name, city").order("name"),
  ]);

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-3 text-xl font-semibold text-slate-900">
        Club verification
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Before you can search players or message families, we confirm your
        club affiliation. An admin reviews every request.
      </p>

      <div className="mt-8">
        {verification?.status === "pending" ? (
          <p className="text-sm text-slate-600">
            Your request to verify with{" "}
            <span className="font-medium text-slate-900">
              {(verification.clubs as unknown as { name: string })?.name}
            </span>{" "}
            is under review.
          </p>
        ) : verification?.status === "approved" ? (
          <p className="text-sm text-slate-600">
            You&rsquo;re verified with{" "}
            <span className="font-medium text-slate-900">
              {(verification.clubs as unknown as { name: string })?.name}
            </span>
            . You can now search players and message families.
          </p>
        ) : (
          <>
            {verification?.status === "rejected" ? (
              <p className="mb-4 text-sm text-amber-800">
                Your last request wasn&rsquo;t approved. You can submit
                again with more detail below.
              </p>
            ) : null}
            <VerifyForm clubs={clubs ?? []} />
          </>
        )}
      </div>
    </main>
  );
}
