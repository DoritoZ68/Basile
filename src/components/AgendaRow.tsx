import Link from "next/link";
import type { ReactNode } from "react";

export function AgendaRow({ href, children }: { href?: string; children: ReactNode }) {
  const className = "flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-ink-faint";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}
