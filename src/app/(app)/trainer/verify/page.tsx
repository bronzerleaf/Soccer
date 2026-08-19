import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitTrainerVerification } from "./actions";

export default async function TrainerVerifyPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const { data: verification } = await supabase
    .from("trainer_verifications")
    .select("status, business_name, created_at")
    .eq("trainer_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verification?.status === "approved") {
    return (
      <main className="mx-auto max-w-sm px-6 py-12">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink trainer</p>
          <h1 className="mt-2 text-xl font-black text-emerald-950">Verification approved</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-800">You can publish training sessions and clinics to the PitchLink feed.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">PitchLink trainer</p>
      <h1 className="mt-2 text-2xl font-black text-[#0b1736]">Verify your trainer profile</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Training posts are limited to verified adult soccer professionals.</p>

      {verification?.status === "pending" ? (
        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">Your verification is under review.</div>
      ) : (
        <form action={submitTrainerVerification} className="pitch-card mt-6 space-y-4 p-5">
          {verification?.status === "rejected" ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Your previous submission was not approved. You can submit better verification details below.</p> : null}
          <label className="block text-sm font-semibold text-slate-800">
            Training business / academy (optional)
            <input name="business_name" type="text" className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Verification details
            <textarea name="evidence" required rows={5} placeholder="Club affiliation, coaching licenses, website, academy page, or other information an admin can confirm..." className="mt-1.5 block w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
          </label>
          <button type="submit" className="w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-bold text-white">Submit for verification</button>
        </form>
      )}
    </main>
  );
}
