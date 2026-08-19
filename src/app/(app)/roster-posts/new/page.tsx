import { requireVerifiedCoach } from "@/lib/coach";
import { POSITIONS } from "@/app/(app)/players/constants";
import { createRosterPost } from "../actions";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: currentYear - 4 - (currentYear - 19) + 1 },
  (_, i) => currentYear - 19 + i
);

export default async function NewRosterPostPage() {
  const { club } = await requireVerifiedCoach();

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-xl font-semibold text-slate-900">
        Post an open roster spot
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Posting for{" "}
        <span className="font-medium text-slate-900">
          {club?.name} — {club?.city}
        </span>
        . This stays visible to families for 30 days.
      </p>

      <form action={createRosterPost} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="birth_year"
            className="block text-sm font-medium text-slate-900"
          >
            Birth year
          </label>
          <select
            id="birth_year"
            name="birth_year"
            required
            className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            <option value="">Select a birth year</option>
            {BIRTH_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-900">
            Position(s) needed
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {POSITIONS.map((position) => (
              <label
                key={position}
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="positions"
                  value={position}
                  className="h-4 w-4"
                />
                {position}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="tryout_date"
            className="block text-sm font-medium text-slate-900"
          >
            Tryout date (optional)
          </label>
          <input
            id="tryout_date"
            name="tryout_date"
            type="date"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-900"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="What are you looking for, and how should families reach out?"
            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Post
        </button>
      </form>
    </main>
  );
}
