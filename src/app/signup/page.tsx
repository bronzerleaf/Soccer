"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/pitchlink/auth-shell";

type Role = "parent" | "coach" | "organization";

export default function SignUpPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("parent");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "check-email">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setStatus("idle");
      return;
    }

    if (data.session) {
      router.push("/feed");
      return;
    }

    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold text-gray-900">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          We sent a confirmation link to {email}. Follow it to finish setting
          up your account.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold text-gray-900">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        OpenRoster connects DFW club soccer families and coaches. Accounts
        are for adults only.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-gray-900">
            I am a...
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                { value: "parent", label: "Parent" },
                { value: "coach", label: "Coach" },
                { value: "organization", label: "Organization" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors ${
                  role === option.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {role === "coach" ? (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              Coach accounts are reviewed before they can search players or
              message families.
            </p>
          ) : null}
          {role === "organization" ? (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              For leagues, tournament directors, and event organizers.
              Reviewed before you can post — organizations never get access
              to player search or messaging.
            </p>
          ) : null}
        </fieldset>

        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-gray-900"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-900"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {status === "submitting" ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gray-900 underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
