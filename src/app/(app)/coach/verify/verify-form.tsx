"use client";

import { useState, type FormEvent } from "react";
import { submitCoachVerification } from "./actions";

type Club = { id: string; name: string; city: string };

export function VerifyForm({ clubs }: { clubs: Club[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitCoachVerification(new FormData(event.currentTarget));
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit your verification."
      );
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-sm text-slate-600">
        Thanks — an admin will review this shortly. You&rsquo;ll be able to
        search players and message families once it&rsquo;s approved.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="claimed_club_id"
          className="block text-sm font-medium text-slate-900"
        >
          Which club are you with?
        </label>
        <select
          id="claimed_club_id"
          name="claimed_club_id"
          required
          className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select a club</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} — {club.city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="evidence"
          className="block text-sm font-medium text-slate-900"
        >
          How can we confirm your affiliation?
        </label>
        <textarea
          id="evidence"
          name="evidence"
          rows={3}
          required
          placeholder="Your club email address, your role, or a contact at the club who can confirm you coach there."
          className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
