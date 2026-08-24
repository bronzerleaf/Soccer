"use client";

import { useState, type FormEvent } from "react";
import { createHighlightPost } from "../actions";
import { HIGHLIGHT_THEMES } from "@/lib/highlight-themes";

type Player = { id: string; first_name: string; last_initial: string; birth_year: number };
type City = { id: string; name: string };

export function HighlightComposerForm({
  players,
  cities,
}: {
  players: Player[];
  cities: City[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createHighlightPost(new FormData(event.currentTarget));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not add this clip."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="player_id" className="block text-sm font-medium text-gray-900">
          Which player?
        </label>
        <select
          id="player_id"
          name="player_id"
          required
          className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          <option value="">Select a player</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_initial}. — {p.birth_year}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-900">
          Link
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="Paste a link (Hudl, Veo, YouTube, Instagram...)"
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="caption" className="block text-sm font-medium text-gray-900">
          What&rsquo;s this clip? (optional)
        </label>
        <input
          id="caption"
          name="caption"
          type="text"
          maxLength={200}
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="theme" className="block text-sm font-medium text-gray-900">
          Video type
        </label>
        <select
          id="theme"
          name="theme"
          defaultValue=""
          className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          <option value="">No theme</option>
          {HIGHLIGHT_THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3">
        <input
          type="checkbox"
          name="share_to_feed"
          checked={shareToFeed}
          onChange={(event) => setShareToFeed(event.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">
            Also show this in the local feed
          </span>
          <span className="block text-xs text-gray-500">
            Otherwise it only appears on your player&rsquo;s profile.
          </span>
        </span>
      </label>

      {shareToFeed ? (
        <div>
          <label htmlFor="city_id" className="block text-sm font-medium text-gray-900">
            City
          </label>
          <select
            id="city_id"
            name="city_id"
            required={shareToFeed}
            className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          >
            <option value="">Select a city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : shareToFeed ? "Add and post to feed" : "Add to profile"}
      </button>
    </form>
  );
}
