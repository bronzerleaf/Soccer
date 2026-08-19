"use client";

import { useState } from "react";
import { PlayerForm } from "../player-form";
import { updatePlayer } from "../actions";

type Club = { id: string; name: string; city: string };
type PlayerValues = Parameters<typeof PlayerForm>[0]["defaultValues"];

export function EditPlayerForm({
  playerId,
  clubs,
  defaultValues,
}: {
  playerId: string;
  clubs: Club[];
  defaultValues: PlayerValues;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PlayerForm
        action={(formData) => updatePlayer(playerId, formData)}
        clubs={clubs}
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
