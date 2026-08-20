"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addHighlight, deleteHighlight } from "../actions";
import { ActionButton } from "@/components/ui/action-button";
import { HighlightTile, type Highlight } from "@/components/ui/link-gallery";
import { HIGHLIGHT_THEMES } from "@/lib/highlight-themes";
import type { OEmbedPreview } from "@/lib/oembed/server";

// The parent's own editable version of the highlight gallery: the same
// tiles a coach would see, plus a "Remove" affordance per tile and a form
// to add another. Lives in its own client component (rather than folded
// into player-form.tsx) because highlights are their own rows — added and
// removed independently, not part of the single player-profile save.
export function HighlightsManager({
  playerId,
  highlights,
  previews,
}: {
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add this link."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {highlights.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((highlight) => (
            <HighlightTile
              key={highlight.id}
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
                  className="!inline-flex !h-6 !items-center !rounded-full !bg-white/90 !px-2 !py-0 !text-[10px] !font-semibold !text-red-600 !shadow-sm hover:!bg-white"
                />
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
          <p className="text-sm text-gray-600">
            Add a Hudl, Veo, YouTube, or Instagram link below and it&rsquo;ll
            show up here as a gallery for coaches to see.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-3 space-y-2 rounded-lg border border-gray-200 p-3"
      >
        <input
          name="url"
          type="url"
          required
          placeholder="Paste a link (Hudl, Veo, YouTube, Instagram...)"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        <input
          name="caption"
          type="text"
          maxLength={200}
          placeholder="What's this clip? (optional)"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        <select
          name="theme"
          defaultValue=""
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          <option value="">No theme</option>
          {HIGHLIGHT_THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add to gallery"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
