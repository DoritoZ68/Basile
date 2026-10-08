export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" className="fill-brand" />
        <path
          d="M20 42 32 22l12 20"
          fill="none"
          className="stroke-on-brand"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="47" r="3.5" fill="#fbbf24" />
      </svg>
      <span className="font-display text-lg text-ink">
        Élan <span className="text-ink-soft">Académie</span>
      </span>
    </span>
  );
}
