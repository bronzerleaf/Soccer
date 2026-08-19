"use client";

import { useRouter } from "next/navigation";
import { PlayerForm } from "../player-form";
import { createPlayer } from "../actions";

export function NewPlayerForm({
  clubs,
  teams,
}: {
  clubs: { id: string; name: string; city: string }[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <PlayerForm
      action={createPlayer}
      clubs={clubs}
      teams={teams}
      submitLabel="Create profile"
      onSuccess={(result) => {
        router.push(`/players/${result.id}`);
      }}
    />
  );
}
