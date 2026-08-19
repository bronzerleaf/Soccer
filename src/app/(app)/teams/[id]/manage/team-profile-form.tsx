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
  defaultValues: {
    name: string;
    city_id: string | null;
    leagues: string[];
    gotsport_team_id: string | null;
    gotsport_url: string | null;
  };
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
      setError(submitError instanceof Error ? submitError.message : "Could not save this team.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800">
        Team name
        <input id="name" name="name" type="text" required defaultValue={defaultValues.name} className={inputClass} />
      </label>

      <label className="block text-sm font-semibold text-slate-800">
        City
        <select id="city_id" name="city_id" defaultValue={defaultValues.city_id ?? ""} className={inputClass}>
          <option value="">Not set</option>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </select>
      </label>

      <div>
        <label htmlFor="leagues" className="block text-sm font-semibold text-slate-800">Leagues / competition level</label>
        <input id="leagues" name="leagues" type="text" defaultValue={defaultValues.leagues.join(", ")} placeholder="Pre-ECNL, ECNL-RL, NPL" className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">Separate multiple leagues with commas.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-black text-[#0b1736]">GotSport reference</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Optional. Add the official team identifier/link as a cross-reference. PitchLink does not copy or scrape GotSport roster or ranking data.
        </p>
        <div className="mt-3 grid gap-3">
          <label className="block text-xs font-bold text-slate-700">
            GotSport Team ID
            <input name="gotsport_team_id" type="text" defaultValue={defaultValues.gotsport_team_id ?? ""} placeholder="Team / ranking ID" className={inputClass} />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Official GotSport team page
            <input name="gotsport_url" type="url" defaultValue={defaultValues.gotsport_url ?? ""} placeholder="https://..." className={inputClass} />
          </label>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
        {submitting ? "Saving..." : "Save team profile"}
      </button>
      {saved ? <p className="text-sm font-semibold text-emerald-700">Saved.</p> : null}
    </form>
  );
}
