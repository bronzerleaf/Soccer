"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "parent" | "coach" | "organization" | "trainer";

export default function SignUpPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("parent");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "check-email">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setStatus("idle");
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      return;
    }
    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <h1 className="text-xl font-semibold text-slate-900">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">We sent a confirmation link to {email}. Follow it to finish setting up your account.</p>
      </main>
    );
  }

  const options = [
    { value: "parent", label: "Parent" },
    { value: "coach", label: "Coach" },
    { value: "trainer", label: "Trainer" },
    { value: "organization", label: "Organization" },
  ] as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">PitchLink</p>
      <h1 className="mt-1 text-2xl font-black text-[#0b1736]">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">PitchLink accounts are for adults. Parents manage all player profiles.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">I am a...</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {options.map((option) => (
              <label key={option.value} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${role === option.value ? "border-[#0b1736] bg-[#0b1736] text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                <input type="radio" name="role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
          {role === "coach" ? <p className="mt-2 text-xs leading-5 text-slate-500">Coach accounts are reviewed before player search or family messaging is unlocked.</p> : null}
          {role === "trainer" ? <p className="mt-2 text-xs leading-5 text-slate-500">Trainer accounts are verified before they can publish training sessions or clinics.</p> : null}
          {role === "organization" ? <p className="mt-2 text-xs leading-5 text-slate-500">For leagues, tournaments and soccer organizations posting events and opportunities.</p> : null}
        </fieldset>

        <label className="block text-sm font-semibold text-slate-900">
          Full name
          <input id="full_name" name="full_name" type="text" required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
        </label>
        <label className="block text-sm font-semibold text-slate-900">
          Email
          <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
        </label>
        <label className="block text-sm font-semibold text-slate-900">
          Password
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
        </label>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        <button type="submit" disabled={status === "submitting"} className="w-full rounded-xl bg-[#0b1736] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          {status === "submitting" ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-bold text-[#0b1736] underline">Log in</Link></p>
    </main>
  );
}
