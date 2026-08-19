"use client";

import { useState, type FormEvent } from "react";
import {
  createFamilyFeedPost,
  createOrgEventPost,
  createCoachFeedPost,
} from "../../actions";
import { POSITIONS } from "@/app/(app)/players/constants";

type City = { id: string; name: string };
type Player = { id: string; first_name: string; last_initial: string; birth_year: number };

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: currentYear - 4 - (currentYear - 19) + 1 },
  (_, i) => currentYear - 19 + i
);

export function ComposerForm({
  mode,
  postType,
  cities,
  players,
}: {
  mode: "parent" | "coach" | "org";
  postType: "looking_for_team" | "guest_play" | "org_event" | "training";
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
      if (mode === "org") {
        await createOrgEventPost(formData);
      } else if (mode === "coach") {
        await createCoachFeedPost(formData);
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
      {mode === "parent" ? (
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

      {mode === "coach" ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="birth_year"
                className="block text-sm font-medium text-slate-900"
              >
                Birth year
              </label>
              <select
                id="birth_year"
                name="birth_year"
                className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              >
                <option value="">Any</option>
                {BIRTH_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {postType === "training" ? (
              <div>
                <label
                  htmlFor="cost_dollars"
                  className="block text-sm font-medium text-slate-900"
                >
                  Cost (optional)
                </label>
                <input
                  id="cost_dollars"
                  name="cost_dollars"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </div>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-900">
              Position (optional)
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <label
                  key={position}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="positions"
                    value={position}
                    className="h-3.5 w-3.5"
                  />
                  {position}
                </label>
              ))}
            </div>
          </fieldset>

          {postType === "training" ? (
            <div>
              <label
                htmlFor="duration_minutes"
                className="block text-sm font-medium text-slate-900"
              >
                Duration in minutes (optional)
              </label>
              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="1"
                placeholder="90"
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Cost is shown as-is on the card — payment still happens off
                the app, same as a tryout.
              </p>
            </div>
          ) : null}
        </>
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
            mode === "org"
              ? "What's the event, when, and how do families sign up?"
              : postType === "training"
                ? "What's the session, when, and how do families sign up?"
                : postType === "guest_play" && mode === "coach"
                  ? "What position, what game, and how can a parent reach you?"
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
