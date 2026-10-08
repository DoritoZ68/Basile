"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CartNavLink } from "@/components/CartNavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/formations", label: "Formations" },
  { href: "/packs", label: "Packs" },
  { href: "/a-propos", label: "Notre méthode" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `rounded-full px-4 py-2 text-sm font-medium transition hover:bg-surface hover:text-ink ${
      pathname.startsWith(href) ? "text-ink" : "text-ink-soft"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)} aria-label="Élan Académie — accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <CartNavLink onClick={() => setOpen(false)} />
          <Link
            href="/formations"
            className="ml-2 hidden h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-bg transition hover:opacity-90 md:flex"
          >
            Commencer
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-surface md:hidden"
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
            {LINKS.map((item) => (
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
              href="/panier"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface hover:text-ink"
            >
              Panier
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
