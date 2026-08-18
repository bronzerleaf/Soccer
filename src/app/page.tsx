import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-slate-500">
        Dallas–Fort Worth club soccer
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        OpenRoster
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
        Connect families whose kids are open to a new club team with
        coaches who have open roster spots — without the group chats and
        tryout rumors.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
