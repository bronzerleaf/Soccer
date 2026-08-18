"use client";

export function DeletePlayerButton({ firstName }: { firstName: string }) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (
          !window.confirm(
            `Permanently delete ${firstName}'s profile? This can't be undone.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="text-sm font-medium text-red-600 underline"
    >
      Delete this profile
    </button>
  );
}
