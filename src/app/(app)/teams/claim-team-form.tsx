"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitTeamClaim } from "./actions";

export function ClaimTeamForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitTeamClaim(teamId, new FormData(event.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit this claim."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-700 underline"
      >
        Claim this team
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        name="evidence"
        rows={2}
        required
        placeholder="How can we confirm you coach this team? A club email, a team website, or a parent who can vouch for you."
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit claim"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
