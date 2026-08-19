"use client";

import { useState, type FormEvent } from "react";
import { LEVELS_OF_PLAY, POSITIONS, PREFERRED_FEET } from "./constants";

type Club = { id: string; name: string; city: string };
type Team = { id: string; name: string };

type PlayerFormValues = {
  first_name: string;
  last_initial: string;
  birth_year: number;
  positions: string[];
  preferred_foot: string | null;
  current_club_id: string | null;
  city: string;
  bio: string | null;
  team_name: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  years_experience: number | null;
  level_of_play: string | null;
};

const currentYear = new Date().getFullYear();

export function PlayerForm<T>({
  action,
  onSuccess,
  clubs,
  teams,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<T>;
  onSuccess?: (result: T) => void;
  clubs: Club[];
  teams: Team[];
  defaultValues?: Partial<PlayerFormValues>;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await action(new FormData(event.currentTarget));
      onSuccess?.(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong saving this profile."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">This profile stays under the parent account.</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          You can edit these details anytime. Only adults have PitchLink accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-slate-800">
          First name
          <input id="first_name" name="first_name" type="text" required defaultValue={defaultValues?.first_name} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Last initial
          <input id="last_initial" name="last_initial" type="text" required maxLength={1} defaultValue={defaultValues?.last_initial} className={inputClass} />
        </label>
      </div>

      <p className="-mt-3 text-xs text-slate-500">
        PitchLink stores a first name and last initial, not a child&rsquo;s full legal name.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-slate-800">
          Birth year
          <input id="birth_year" name="birth_year" type="number" required min={currentYear - 19} max={currentYear - 4} defaultValue={defaultValues?.birth_year} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          City
          <input id="city" name="city" type="text" required defaultValue={defaultValues?.city} className={inputClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-slate-800">
          Years playing
          <select name="years_experience" defaultValue={defaultValues?.years_experience ?? ""} className={inputClass}>
            <option value="">Not listed</option>
            {Array.from({ length: 19 }, (_, i) => i).map((years) => (
              <option key={years} value={years}>{years}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Level of play
          <select name="level_of_play" defaultValue={defaultValues?.level_of_play ?? ""} className={inputClass}>
            <option value="">Not listed</option>
            {LEVELS_OF_PLAY.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Position(s)</legend>
        <p className="mt-1 text-xs text-slate-500">Choose every position the player is comfortable playing.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POSITIONS.map((position) => (
            <label key={position} className="cursor-pointer">
              <input type="checkbox" name="positions" value={position} defaultChecked={defaultValues?.positions?.includes(position)} className="peer sr-only" />
              <span className="block rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">
                {position}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Preferred foot</legend>
        <div className="mt-2 flex gap-2">
          {PREFERRED_FEET.map((foot) => (
            <label key={foot} className="cursor-pointer">
              <input type="radio" name="preferred_foot" value={foot} defaultChecked={defaultValues?.preferred_foot === foot} className="peer sr-only" />
              <span className="block rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize text-slate-600 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">
                {foot}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold text-slate-800">
        Current club
        <select id="current_club_id" name="current_club_id" defaultValue={defaultValues?.current_club_id ?? ""} className={inputClass}>
          <option value="">Not listed yet</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>{club.name} — {club.city}</option>
          ))}
        </select>
      </label>

      <div>
        <label htmlFor="team_name" className="block text-sm font-semibold text-slate-800">Team</label>
        <input id="team_name" name="team_name" type="text" list="team-suggestions" placeholder="e.g. Solar SC 2015B" defaultValue={defaultValues?.team_name ?? ""} className={inputClass} />
        <datalist id="team-suggestions">
          {teams.map((team) => <option key={team.id} value={team.name} />)}
        </datalist>
        <p className="mt-1 text-xs text-slate-500">
          Pick an existing PitchLink team or type the exact team name. Team membership is verified separately.
        </p>
      </div>

      <label className="block text-sm font-semibold text-slate-800">
        About the player
        <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={defaultValues?.bio ?? ""} placeholder="Style of play, strengths, development focus..." className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-slate-800">
          Instagram
          <input id="instagram_url" name="instagram_url" type="url" placeholder="https://instagram.com/..." defaultValue={defaultValues?.instagram_url ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          YouTube
          <input id="youtube_url" name="youtube_url" type="url" placeholder="https://youtube.com/@..." defaultValue={defaultValues?.youtube_url ?? ""} className={inputClass} />
        </label>
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        Use soccer-focused accounts when possible. Individual clip links are managed separately below the profile.
      </p>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#13264e] disabled:opacity-60">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
