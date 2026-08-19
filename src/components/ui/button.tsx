import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500";

const variants: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:text-slate-900",
  danger: "bg-transparent text-red-600 hover:text-red-700 font-medium underline shadow-none",
  ghost: "bg-transparent text-slate-500 hover:text-slate-900 font-medium shadow-none",
};

const sizes: Record<Size, string> = {
  md: "px-3.5 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return [base, variants[variant], variant !== "danger" && variant !== "ghost" ? sizes[size] : "text-sm", extra]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
