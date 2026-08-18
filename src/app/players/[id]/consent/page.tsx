import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createConsentIntent } from "./actions";
import { ConsentForm } from "./consent-form";

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, consent_completed")
    .eq("id", id)
    .single();

  if (!player) {
    notFound();
  }

  if (player.consent_completed) {
    redirect(`/players/${id}`);
  }

  const { clientSecret } = await createConsentIntent(id);

  if (!clientSecret) {
    throw new Error("Could not start the consent authorization.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold text-slate-900">
        Confirm you&rsquo;re {player.first_name}&rsquo;s parent or guardian
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        We ask every parent to verify with a card before a player profile
        goes live. Your card will be authorized for $0.50 and released
        immediately — you are never charged.
      </p>

      <div className="mt-8">
        <ConsentForm playerId={id} clientSecret={clientSecret} />
      </div>
    </main>
  );
}
