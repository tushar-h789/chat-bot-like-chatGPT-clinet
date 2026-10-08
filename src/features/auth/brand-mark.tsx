export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="10" fill="#111113" />
      <path d="M13 12.5h14v3.2h-5.3V27.5h-3.4V15.7H13V12.5z" fill="#FAFAFA" />
      <circle cx="29.2" cy="29.2" r="3.4" fill="#2DD4BF" />
    </svg>
  );
}
