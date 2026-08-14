"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/content";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FavoritesNavLink } from "@/components/FavoritesNavLink";
import { ThemeToggle } from "@/components/ThemeToggle";

const CATEGORY_LINKS = (["om", "ville", "culture", "mer"] as const).map((key) => ({
  href: `/rubrique/${key}`,
  label: CATEGORIES[key].label,
}));

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-coral" />
            <span className="h-2.5 w-2.5 rounded-full bg-teal" />
          </span>
          <span className="font-display text-lg text-ink">3 Points</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {CATEGORY_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
          <Link
            href="/agenda"
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
          >
            Agenda
          </Link>
          <FavoritesNavLink />
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SearchOverlay />
          <Link
            href="/a-propos"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface hover:text-ink lg:block"
          >
            À propos
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-surface lg:hidden"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <path d="M0 1H18" stroke="currentColor" strokeWidth="2" />
              <path d="M0 7H18" stroke="currentColor" strokeWidth="2" />
              <path d="M0 13H18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {CATEGORY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/agenda"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
            >
              Agenda
            </Link>
            <FavoritesNavLink variant="mobile" onClick={() => setOpen(false)} />
            <Link
              href="/a-propos"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
            >
              À propos
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
