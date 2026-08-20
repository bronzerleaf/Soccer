import type { ReactNode } from "react";
import { AuthScene } from "./auth-scene";

// Shared login/signup chrome: the animated pitch scene as a full-bleed
// background, a polished translucent card on top. The scene is purely
// decorative (aria-hidden) — every real control lives in the card.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1524]">
      <AuthScene />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
        <div className="rounded-[18px] border border-white/15 bg-white/95 p-6 shadow-[0_10px_28px_rgba(17,24,39,0.35)] backdrop-blur">
          {children}
        </div>
      </main>
    </div>
  );
}
