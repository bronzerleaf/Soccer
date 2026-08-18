"use client";

import { useRouter } from "next/navigation";
import { PlayerForm } from "../player-form";
import { createPlayer } from "../actions";

export function NewPlayerForm({
  clubs,
}: {
  clubs: { id: string; name: string; city: string }[];
}) {
  const router = useRouter();

  return (
    <PlayerForm
      action={createPlayer}
      clubs={clubs}
      submitLabel="Create profile"
      onSuccess={(result) => {
        router.push(`/players/${result.id}`);
      }}
    />
  );
}
