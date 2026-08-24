import type { ReactNode } from "react";

// Shared login/signup chrome: the approved reference's hero photo (ball
// hitting the top corner of the net) above a plain card — cropped
// straight from docs/design-handoff/mockups/01_LOGIN_SIGNUP_REFERENCE.png,
// with the "PitchLink" wordmark cropped out (this app is OpenRoster).
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--pl-cream)]">
      <div className="relative h-[34vh] max-h-[300px] min-h-[200px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auth-hero.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[var(--pl-cream)]" />
      </div>
      <main className="relative z-10 mx-auto -mt-8 max-w-sm px-6 pb-16">
        <div className="rounded-[18px] border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(17,24,39,0.12)]">
          {children}
        </div>
      </main>
    </div>
  );
}
