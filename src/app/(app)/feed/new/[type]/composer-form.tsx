"use client";

import { useState, type FormEvent } from "react";
import { createFamilyFeedPost, createOrgEventPost } from "../../actions";

type City = { id: string; name: string };
type Player = { id: string; first_name: string; last_initial: string; birth_year: number };

export function ComposerForm({
  postType,
  cities,
  players,
}: {
  postType: "looking_for_team" | "guest_play" | "org_event";
  cities: City[];
  players?: Player[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("post_type", postType);
      if (postType === "org_event") {
        await createOrgEventPost(formData);
      } else {
        await createFamilyFeedPost(formData);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not post this."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {postType !== "org_event" ? (
        <div>
          <label
            htmlFor="player_id"
            className="block text-sm font-medium text-slate-900"
          >
            Which player?
          </label>
          <select
            id="player_id"
            name="player_id"
            required
            className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            <option value="">Select a player</option>
            {(players ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_initial}. — {p.birth_year}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Only consent-verified players can be posted. Birth year and
            position come from their profile — never a name or photo shows
            in the feed.
          </p>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="city_id"
          className="block text-sm font-medium text-slate-900"
        >
          City
        </label>
        <select
          id="city_id"
          name="city_id"
          required
          className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select a city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-900"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          placeholder={
            postType === "org_event"
              ? "What's the event, when, and how do families sign up?"
              : "What are you looking for?"
          }
          className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Posting..." : "Post to the feed"}
      </button>
    </form>
  );
}
