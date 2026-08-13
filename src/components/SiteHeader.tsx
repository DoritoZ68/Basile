"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/content";
import { SearchOverlay } from "@/components/SearchOverlay";

const NAV = [
  { href: "/#mercato", label: CATEGORIES.mercato.short },
  { href: "/#match", label: CATEGORIES.match.short },
  { href: "/#vestiaire", label: CATEGORIES.vestiaire.short },
  { href: "/#video", label: CATEGORIES.video.short },
  { href: "/archives", label: "Archives" },
  { href: "/a-propos", label: "À propos" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur supports-[backdrop-filter]:bg-ink/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-strong font-display text-base text-ink shadow-[0_0_0_3px_rgba(63,193,255,0.15)]">
            OM
          </span>
          <span className="font-display text-lg leading-none text-white sm:text-xl">
            en <span className="text-gold">3</span> points
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-mist transition hover:bg-panel hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchOverlay />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-white md:hidden"
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
        <nav className="border-t border-line px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-mist hover:bg-panel hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
