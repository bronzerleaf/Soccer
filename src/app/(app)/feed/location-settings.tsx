"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setLocationPreference } from "./actions";

type City = { id: string; name: string };

const RADIUS_OPTIONS = [5, 10, 25, 50];

export function LocationSettings({
  cities,
  homeCityId,
  radiusMiles,
}: {
  cities: City[];
  homeCityId: string | null;
  radiusMiles: number | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(!homeCityId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await setLocationPreference(new FormData(event.currentTarget));
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const cityName = cities.find((c) => c.id === homeCityId)?.name;

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-700">
          Showing posts within{" "}
          <span className="font-medium text-slate-900">
            {radiusMiles} miles
          </span>{" "}
          of <span className="font-medium text-slate-900">{cityName}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-slate-700 underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 p-4"
    >
      <p className="text-sm font-medium text-slate-900">
        Set your area to filter the feed
      </p>
      <p className="mt-1 text-xs text-slate-500">
        We only ever use the city you pick here, never your exact location.
        Traveling for a tournament? Just change this to wherever you are.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="home_city_id"
            className="block text-xs font-medium text-slate-900"
          >
            City
          </label>
          <select
            id="home_city_id"
            name="home_city_id"
            defaultValue={homeCityId ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
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
            htmlFor="radius_miles"
            className="block text-xs font-medium text-slate-900"
          >
            Radius
          </label>
          <select
            id="radius_miles"
            name="radius_miles"
            defaultValue={radiusMiles ?? ""}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            <option value="">Any distance</option>
            {RADIUS_OPTIONS.map((mi) => (
              <option key={mi} value={mi}>
                {mi} miles
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
