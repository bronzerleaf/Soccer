import { createClient } from "@/lib/supabase/server";
import { fetchOEmbedPreview } from "@/lib/oembed/server";
import { ClipFeedCard, type ClipFeedComment, type ClipFeedItem } from "./clip-feed-card";

export async function ClipFeedSection() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: rows } = await supabase.rpc("get_feed_clips", { max_rows: 20 });
  const clips = (rows ?? []) as Array<{
    highlight_id: string;
    player_id: string;
    first_name: string;
    last_initial: string;
    birth_year: number;
    positions: string[];
    level_of_play: string | null;
    years_experience: number | null;
    team_name: string | null;
    team_verified: boolean;
    url: string;
    caption: string | null;
    theme: string | null;
    created_at: string;
  }>;

  if (clips.length === 0) return null;

  const ids = clips.map((clip) => clip.highlight_id);
  const [{ data: likes }, { data: myLikes }] = await Promise.all([
    supabase.from("player_highlight_likes").select("highlight_id").in("highlight_id", ids),
    supabase
      .from("player_highlight_likes")
      .select("highlight_id")
      .eq("profile_id", userData.user.id)
      .in("highlight_id", ids),
  ]);

  const likeCount = new Map<string, number>();
  for (const like of likes ?? []) {
    likeCount.set(like.highlight_id, (likeCount.get(like.highlight_id) ?? 0) + 1);
  }
  const likedByMe = new Set((myLikes ?? []).map((like) => like.highlight_id));

  const [previewList, commentResults] = await Promise.all([
    Promise.all(clips.map((clip) => fetchOEmbedPreview(clip.url))),
    Promise.all(
      clips.map((clip) =>
        supabase.rpc("get_feed_clip_comments", { target_highlight_id: clip.highlight_id })
      )
    ),
  ]);

  const items: ClipFeedItem[] = clips.map((clip, index) => ({
    highlightId: clip.highlight_id,
    playerId: clip.player_id,
    firstName: clip.first_name,
    lastInitial: clip.last_initial,
    birthYear: clip.birth_year,
    positions: clip.positions ?? [],
    levelOfPlay: clip.level_of_play,
    yearsExperience: clip.years_experience,
    teamName: clip.team_name,
    teamVerified: clip.team_verified,
    url: clip.url,
    caption: clip.caption,
    theme: clip.theme,
    createdAt: clip.created_at,
    likeCount: likeCount.get(clip.highlight_id) ?? 0,
    likedByMe: likedByMe.has(clip.highlight_id),
    comments: ((commentResults[index].data ?? []) as ClipFeedComment[]),
  }));

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Player clips</p>
          <h2 className="mt-1 text-lg font-black text-[#0b1736]">Latest from the community</h2>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <ClipFeedCard key={item.highlightId} clip={item} preview={previewList[index]} />
        ))}
      </div>
    </section>
  );
}
