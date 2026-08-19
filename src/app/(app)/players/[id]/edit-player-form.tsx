"use client";

import { useState } from "react";
import { PlayerForm } from "../player-form";
import { updatePlayer } from "../actions";

type Club = { id: string; name: string; city: string };
type Team = { id: string; name: string };
type PlayerValues = Parameters<typeof PlayerForm>[0]["defaultValues"];

export function EditPlayerForm({
  playerId,
  clubs,
  teams,
  defaultValues,
}: {
  playerId: string;
  clubs: Club[];
  teams: Team[];
  defaultValues: PlayerValues;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PlayerForm
        action={(formData) => updatePlayer(playerId, formData)}
        clubs={clubs}
        teams={teams}
        defaultValues={defaultValues}
        submitLabel="Save changes"
        onSuccess={() => setSaved(true)}
      />
      {saved ? (
        <p className="mt-3 text-sm text-slate-600">Saved.</p>
      ) : null}
    </div>
  );
}
