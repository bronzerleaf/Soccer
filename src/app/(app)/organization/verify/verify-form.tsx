"use client";

import { useState, type FormEvent } from "react";
import { submitOrganizationVerification } from "./actions";

export function OrganizationVerifyForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitOrganizationVerification(new FormData(event.currentTarget));
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
      <p className="text-sm text-gray-600">
        Thanks — an admin will review this shortly. You&rsquo;ll be able to
        post tournament and event listings to the local feed once
        it&rsquo;s approved.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="org_name"
          className="block text-sm font-medium text-gray-900"
        >
          Organization name
        </label>
        <input
          id="org_name"
          name="org_name"
          type="text"
          required
          placeholder="DFW Fall Showcase"
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="evidence"
          className="block text-sm font-medium text-gray-900"
        >
          How can we confirm this organization?
        </label>
        <textarea
          id="evidence"
          name="evidence"
          rows={3}
          required
          placeholder="A website, an organization email address, or a contact who can confirm you run this event."
          className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
