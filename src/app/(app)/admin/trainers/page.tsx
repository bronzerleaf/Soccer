import { requireAdmin } from "@/lib/admin";
import { approveTrainerVerification, rejectTrainerVerification } from "./actions";

export default async function AdminTrainersPage() {
  const { supabase } = await requireAdmin();
  const { data: rows } = await supabase
    .from("trainer_verifications")
    .select("id, business_name, evidence, status, created_at, trainer:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-black text-[#0b1736]">Trainer verification</h1>
      <p className="mt-2 text-sm text-slate-500">Approve adult trainer accounts before they can publish training opportunities.</p>
      <div className="mt-6 space-y-3">
        {(rows ?? []).map((row) => {
          const trainer = row.trainer as unknown as { full_name: string; email: string } | null;
          return (
            <div key={row.id} className="pitch-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#0b1736]">{trainer?.full_name ?? "Trainer"}</p>
                  <p className="text-xs text-slate-500">{trainer?.email}</p>
                  {row.business_name ? <p className="mt-1 text-xs font-semibold text-slate-700">{row.business_name}</p> : null}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.status === "approved" ? "bg-emerald-50 text-emerald-700" : row.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{row.status}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{row.evidence}</p>
              {row.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <form action={approveTrainerVerification.bind(null, row.id)}><button className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Approve</button></form>
                  <form action={rejectTrainerVerification.bind(null, row.id)}><button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Reject</button></form>
                </div>
              ) : null}
            </div>
          );
        })}
        {!rows?.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No trainer verification requests yet.</p> : null}
      </div>
    </main>
  );
}
