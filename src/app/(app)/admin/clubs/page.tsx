import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { createClub, deleteClub } from "./actions";
import { ALL_AGE_GROUPS } from "./constants";

export default async function AdminClubsPage() {
  const { supabase } = await requireAdmin();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, city, age_groups")
    .order("name");

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/admin" className="text-sm text-gray-500 underline">
        ← Admin
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Club list
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        The curated dropdown parents and coaches pick from.
      </p>

      <ul className="mt-8 space-y-2">
        {(clubs ?? []).map((club) => (
          <li
            key={club.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {club.name}
              </p>
              <p className="text-sm text-gray-500">
                {club.city} · {(club.age_groups ?? []).join(", ")}
              </p>
            </div>
            <ActionButton
              action={deleteClub.bind(null, club.id)}
              label="Remove"
              pendingLabel="Removing..."
              successMessage={`${club.name} removed`}
              confirmMessage={`Remove ${club.name} from the club list?`}
              variant="danger"
            />
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-sm font-medium text-gray-900">Add a club</h2>
        <form action={createClub} className="mt-3 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-900"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-900"
            >
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-gray-900">
              Age groups fielded
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_AGE_GROUPS.map((group) => (
                <label
                  key={group}
                  className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    name="age_groups"
                    value={group}
                    defaultChecked
                    className="h-3.5 w-3.5"
                  />
                  {group}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" className="w-full">
            Add club
          </Button>
        </form>
      </div>
    </main>
  );
}
