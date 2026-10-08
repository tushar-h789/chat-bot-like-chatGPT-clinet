import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = {
  label: string;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function IconButton({
  label,
  active = false,
  danger = false,
  className = "",
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  const tone = active
    ? "bg-white text-zinc-950 hover:bg-zinc-100"
    : danger
      ? "text-zinc-300 hover:bg-red-500/15 hover:text-red-100"
      : "text-zinc-300 hover:bg-white/10 hover:text-zinc-50";

  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40 ${tone} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
