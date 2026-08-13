import Link from "next/link";
import { SearchOverlay } from "@/components/SearchOverlay";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-coral" />
            <span className="h-2.5 w-2.5 rounded-full bg-teal" />
          </span>
          <span className="font-display text-lg text-ink">3 Points</span>
        </Link>

        <div className="flex items-center gap-1">
          <SearchOverlay />
          <Link
            href="/a-propos"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink sm:block"
          >
            À propos
          </Link>
        </div>
      </div>
    </header>
  );
}
