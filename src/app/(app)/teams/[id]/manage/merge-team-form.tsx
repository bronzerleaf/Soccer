"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { mergeTeam } from "./actions";

export function MergeTeamForm({
  teamId,
  candidates,
}: {
  teamId: string;
  candidates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [sourceId, setSourceId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-gray-500">No other teams to merge in.</p>
    );
  }

  async function handleMerge() {
    if (!sourceId) return;
    const chosen = candidates.find((team) => team.id === sourceId);
    if (
      !window.confirm(
        `Fold "${chosen?.name}" into this team? This can't be undone.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await mergeTeam(sourceId, teamId);
      toast("Team merged in");
      router.refresh();
      setSourceId("");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not merge this team.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={sourceId}
        onChange={(event) => setSourceId(event.target.value)}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
      >
        <option value="">Select a duplicate team...</option>
        {candidates.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleMerge}
        disabled={!sourceId || submitting}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {submitting ? "Merging..." : "Merge into this team"}
      </button>
    </div>
  );
}
