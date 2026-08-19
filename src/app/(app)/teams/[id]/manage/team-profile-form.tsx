"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateTeamProfile } from "./actions";

type City = { id: string; name: string };

export function TeamProfileForm({
  teamId,
  cities,
  defaultValues,
}: {
  teamId: string;
  cities: City[];
  defaultValues: { name: string; city_id: string | null; leagues: string[] };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateTeamProfile(teamId, new FormData(event.currentTarget));
      setSaved(true);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this team."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-900"
        >
          Team name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name}
          className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>

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
          defaultValue={defaultValues.city_id ?? ""}
          className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        >
          <option value="">Not set</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="leagues"
          className="block text-sm font-medium text-slate-900"
        >
          Leagues
        </label>
        <input
          id="leagues"
          name="leagues"
          type="text"
          defaultValue={defaultValues.leagues.join(", ")}
          placeholder="NTX Fall League, ECNL Regional"
          className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Separate multiple leagues with commas.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save changes"}
      </button>
      {saved ? <p className="text-sm text-slate-600">Saved.</p> : null}
    </form>
  );
}
