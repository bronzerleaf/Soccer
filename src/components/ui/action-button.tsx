"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast-provider";
import { buttonClass } from "./button";

/**
 * For actions that only ever revalidatePath and never redirect() — e.g.
 * approve/reject, expire/delete, dismiss, toggle. Gives instant press
 * feedback and a toast instead of a silent re-render.
 *
 * Deliberately not used for actions that redirect() (deletePlayer,
 * signOut): calling those directly from a client onClick handler wrapped
 * in try/catch can swallow Next's internal redirect signal. Those stay
 * as plain <form action={...}> submissions, which handle redirects
 * correctly on their own.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  successMessage,
  confirmMessage,
  variant = "primary",
  size = "md",
  className = "",
}: {
  action: () => Promise<unknown>;
  label: string;
  pendingLabel?: string;
  successMessage?: string;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setSubmitting(true);
    startTransition(async () => {
      try {
        await action();
        if (successMessage) toast(successMessage);
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Something went wrong.", "error");
      } finally {
        setSubmitting(false);
      }
    });
  }

  const busy = submitting || isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={buttonClass(variant, size, className)}
    >
      {busy ? pendingLabel ?? label : label}
    </button>
  );
}
