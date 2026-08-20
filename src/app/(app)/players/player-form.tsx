"use client";

import { useState, type FormEvent } from "react";
import { POSITIONS, PREFERRED_FEET } from "./constants";

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
    setError(null);
    setSubmitting(true);
    try {
      const result = await action(new FormData(event.currentTarget));
      onSuccess?.(result);
      setSubmitting(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong saving this profile."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-gray-900"
          >
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            defaultValue={defaultValues?.first_name}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="last_initial"
            className="block text-sm font-medium text-gray-900"
          >
            Last initial
          </label>
          <input
            id="last_initial"
            name="last_initial"
            type="text"
            required
            maxLength={1}
            defaultValue={defaultValues?.last_initial}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        We only ever collect a first name and last initial — never a full
        legal name.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="instagram_url"
            className="block text-sm font-medium text-gray-900"
          >
            Instagram (optional)
          </label>
          <input
            id="instagram_url"
            name="instagram_url"
            type="url"
            placeholder="https://instagram.com/..."
            defaultValue={defaultValues?.instagram_url ?? ""}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="youtube_url"
            className="block text-sm font-medium text-gray-900"
          >
            YouTube (optional)
          </label>
          <input
            id="youtube_url"
            name="youtube_url"
            type="url"
            placeholder="https://youtube.com/@..."
            defaultValue={defaultValues?.youtube_url ?? ""}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-gray-500">
        A recruiting or highlights account works best here — coaches can
        click straight through to it. Only ever shown to a verified
        coach, same as the rest of this profile.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="birth_year"
            className="block text-sm font-medium text-gray-900"
          >
            Birth year
          </label>
          <input
            id="birth_year"
            name="birth_year"
            type="number"
            required
            min={currentYear - 19}
            max={currentYear - 4}
            defaultValue={defaultValues?.birth_year}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-900"
          >
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            defaultValue={defaultValues?.city}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-900">
          Position(s)
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {POSITIONS.map((position) => (
            <label
              key={position}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                name="positions"
                value={position}
                defaultChecked={defaultValues?.positions?.includes(position)}
                className="h-4 w-4"
              />
              {position}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-gray-900">
          Preferred foot
        </legend>
        <div className="mt-2 flex gap-2">
          {PREFERRED_FEET.map((foot) => (
            <label
              key={foot}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm capitalize text-gray-700"
            >
              <input
                type="radio"
                name="preferred_foot"
                value={foot}
                defaultChecked={defaultValues?.preferred_foot === foot}
                className="h-4 w-4"
              />
              {foot}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="current_club_id"
          className="block text-sm font-medium text-gray-900"
        >
          Current club/team
        </label>
        <select
          id="current_club_id"
          name="current_club_id"
          defaultValue={defaultValues?.current_club_id ?? ""}
          className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          <option value="">Not listed yet</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} — {club.city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="team_name"
          className="block text-sm font-medium text-gray-900"
        >
          Team
        </label>
        <input
          id="team_name"
          name="team_name"
          type="text"
          list="team-suggestions"
          placeholder="e.g. Solar SC 2013 Boys"
          defaultValue={defaultValues?.team_name ?? ""}
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        <datalist id="team-suggestions">
          {teams.map((team) => (
            <option key={team.id} value={team.name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-gray-500">
          Type the team name. If it&rsquo;s not listed yet, just type it and
          we&rsquo;ll add it — a coach can later verify ownership of it.
        </p>
      </div>

      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-900"
        >
          Short bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultValues?.bio ?? ""}
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
