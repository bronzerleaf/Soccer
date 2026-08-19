"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addHighlight, deleteHighlight, setHighlightFeedVisibility } from "../actions";
import { ActionButton } from "@/components/ui/action-button";
import { HighlightTile, type Highlight } from "@/components/ui/link-gallery";
import { HIGHLIGHT_THEMES } from "@/lib/highlight-themes";
import type { OEmbedPreview } from "@/lib/oembed/server";

export function HighlightsManager({ playerId, highlights, previews }: {
  playerId: string;
  highlights: Highlight[];
  previews: Record<string, OEmbedPreview | null>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = event.currentTarget;
    try {
      await addHighlight(playerId, new FormData(form));
      form.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add this clip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {highlights.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((highlight) => (
            <div key={highlight.id}>
              <HighlightTile
                highlight={highlight}
                preview={previews[highlight.id] ?? null}
                actions={
                  <ActionButton
                    action={deleteHighlight.bind(null, highlight.id, playerId)}
                    label="Remove"
                    pendingLabel="..."
                    successMessage="Removed"
                    variant="ghost"
                    size="sm"
                    className="!h-6 !rounded-full !bg-white/90 !px-2 !py-0 !text-[10px] !font-semibold !text-red-600 !shadow-sm"
                  />
                }
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${highlight.show_in_feed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {highlight.show_in_feed ? "Profile + feed" : "Profile only"}
                </span>
                <ActionButton
                  action={setHighlightFeedVisibility.bind(null, highlight.id, playerId, !highlight.show_in_feed)}
                  label={highlight.show_in_feed ? "Profile only" : "Add to feed"}
                  pendingLabel="Saving..."
                  successMessage={highlight.show_in_feed ? "Updated" : "Added to feed"}
                  variant="ghost"
                  size="sm"
                  className="!px-2 !text-[10px] !font-bold !text-emerald-700"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">Build the clip gallery</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Paste a Hudl, Veo, YouTube, Instagram, or other supported link.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pitch-card mt-4 space-y-3 p-4">
        <label className="block text-xs font-bold text-slate-700">
          Clip link
          <input name="url" type="url" required placeholder="Hudl, Veo, YouTube, Instagram..." className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          About this clip
          <textarea name="caption" rows={2} maxLength={200} placeholder="Describe the play or moment..." className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Clip theme
          <select name="theme" required defaultValue="" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
            <option value="" disabled>Choose a theme</option>
            {HIGHLIGHT_THEMES.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="text-xs font-bold text-slate-700">Visibility</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="visibility" value="profile" defaultChecked className="peer sr-only" />
              <span className="block rounded-xl border border-slate-200 p-3 text-xs peer-checked:border-emerald-500 peer-checked:bg-emerald-50">
                <strong className="block text-slate-900">Profile only</strong>
                <span className="mt-1 block text-slate-500">Keep it in the profile gallery.</span>
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="visibility" value="feed" className="peer sr-only" />
              <span className="block rounded-xl border border-slate-200 p-3 text-xs peer-checked:border-emerald-500 peer-checked:bg-emerald-50">
                <strong className="block text-slate-900">Profile + feed</strong>
                <span className="mt-1 block text-slate-500">Also include it in the feed.</span>
              </span>
            </label>
          </div>
        </fieldset>
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#0b1736] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {submitting ? "Adding..." : "Add clip"}
        </button>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
