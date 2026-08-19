"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tone = "default" | "error";
type ToastItem = { id: number; message: string; tone: Tone; leaving: boolean };

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used within ToastProvider");
  return push;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, tone: Tone = "default") => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, message, tone, leaving: false }]);

    setTimeout(() => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, leaving: true } : item))
      );
    }, 2200);

    setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300 ${
              item.leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
            } ${item.tone === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
