"use client";

import { useState } from "react";
import { flagMessage } from "../actions";

export function FlagMessageButton({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="mt-1 text-xs text-gray-400">Reported</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs text-gray-400 underline"
      >
        Report
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await flagMessage(messageId, formData);
        setDone(true);
      }}
      className="mt-1 flex items-center gap-1.5"
    >
      <input
        name="reason"
        type="text"
        placeholder="What's wrong with this message? (optional)"
        className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-900 focus:border-gray-500 focus:outline-none"
      />
      <button
        type="submit"
        className="text-xs font-medium text-gray-600 underline"
      >
        Submit
      </button>
    </form>
  );
}
