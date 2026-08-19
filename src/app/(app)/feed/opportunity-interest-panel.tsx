import { createClient } from "@/lib/supabase/server";
import { expressOpportunityInterest, removeOpportunityInterest } from "./opportunity-interest-actions";

export async function OpportunityInterestPanel({
  kind,
  targetId,
}: {
  kind: "roster" | "feed";
  targetId: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();

  if (profile?.role === "parent") {
    const [{ data: players }, { data: interests }] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("parent_id", userData.user.id)
        .eq("consent_completed", true)
        .order("first_name"),
      supabase
        .from("opportunity_interests")
        .select("id, player_id, note")
        .eq("parent_id", userData.user.id)
        .eq(kind === "roster" ? "roster_post_id" : "feed_post_id", targetId),
    ]);

    const current = interests?.[0] ?? null;
    const interestedPlayer = current ? (players ?? []).find((player) => player.id === current.player_id) : null;

    if (current) {
      return (
        <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-950">Interest sent</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {interestedPlayer ? `${interestedPlayer.first_name} ${interestedPlayer.last_initial}.` : "Your player"} has been shared with the author of this opportunity.
          </p>
          {current.note ? <p className="mt-2 text-xs italic text-emerald-800">“{current.note}”</p> : null}
          <form action={removeOpportunityInterest.bind(null, kind, targetId, current.id)} className="mt-3">
            <button type="submit" className="text-xs font-bold text-emerald-800 underline">Remove interest</button>
          </form>
        </section>
      );
    }

    if (!players?.length) return null;

    return (
      <section className="pitch-card mt-6 p-5">
        <h2 className="text-base font-black text-[#0b1736]">Interested?</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Let the poster know which player is interested. This does not change the player&rsquo;s private search setting.
        </p>
        <form action={expressOpportunityInterest.bind(null, kind, targetId)} className="mt-4 space-y-3">
          <select name="player_id" required defaultValue="" className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400">
            <option value="" disabled>Choose player</option>
            {players.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_initial}. · {player.birth_year}</option>)}
          </select>
          <textarea name="note" rows={2} maxLength={500} placeholder="Optional note to the coach, trainer or organization..." className="block w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
          <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">I&rsquo;m interested</button>
        </form>
      </section>
    );
  }

  let isAuthor = false;
  if (kind === "roster") {
    const { data: post } = await supabase.from("roster_posts").select("coach_id").eq("id", targetId).maybeSingle();
    isAuthor = post?.coach_id === userData.user.id;
  } else {
    const { data: post } = await supabase.from("feed_posts").select("author_id").eq("id", targetId).maybeSingle();
    isAuthor = post?.author_id === userData.user.id;
  }
  if (!isAuthor) return null;

  const { data: interestedRows, error } = await supabase.rpc("get_opportunity_interested_players", {
    target_kind: kind,
    target_id: targetId,
  });
  if (error || !interestedRows?.length) return null;

  return (
    <section className="pitch-card mt-6 p-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-base font-black text-[#0b1736]">Interested players</h2>
          <p className="mt-1 text-xs text-slate-500">Families who explicitly raised their hand for this post.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{interestedRows.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {interestedRows.map((player: {
          interest_id: string;
          player_id: string;
          first_name: string;
          last_initial: string;
          birth_year: number;
          positions: string[];
          years_experience: number | null;
          level_of_play: string | null;
          note: string | null;
        }) => (
          <div key={player.interest_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-[#0b1736]">{player.first_name} {player.last_initial}.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{player.birth_year} · {(player.positions ?? []).join(" · ") || "Position not listed"}</p>
            {player.years_experience !== null || player.level_of_play ? <p className="mt-1 text-[11px] text-slate-400">{[player.level_of_play, player.years_experience !== null ? `${player.years_experience} yrs playing` : null].filter(Boolean).join(" · ")}</p> : null}
            {player.note ? <p className="mt-2 text-xs leading-5 text-slate-600">{player.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
