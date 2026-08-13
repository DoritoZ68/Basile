"use client";

import { useState } from "react";

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing to fall back to silently.
    }
  }

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-mist-dim">Partager</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mist transition hover:border-sky hover:text-sky"
        aria-label="Partager sur X"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.5-7.2L4.4 22H1.3l8.1-9.3L1 2h7.3l5 6.6L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
        </svg>
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mist transition hover:border-sky hover:text-sky"
        aria-label="Partager sur WhatsApp"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a15 15 0 0 1-4.6-2.9 12 12 0 0 1-2.5-3.2c-.6-1-.2-1.6.2-2 .3-.3.7-.5 1-.6.2 0 .4 0 .5.3l.9 2c.1.2 0 .5-.1.6l-.5.6c-.1.2-.2.4 0 .7a8 8 0 0 0 3.4 3c.3.1.5.1.6-.1l.6-.7c.2-.2.4-.3.6-.2l1.9 1c.2.1.4.2.4.4 0 .3 0 .6-.1.8Z" />
        </svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mist transition hover:border-sky hover:text-sky"
        aria-label="Partager sur Facebook"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.1c0-1 .3-1.6 1.7-1.6h1.7V3.5A22 22 0 0 0 14.4 3c-2.6 0-4.4 1.6-4.4 4.5v2.8H7.2v3.3H10V22h3.5Z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-mist transition hover:border-sky hover:text-sky"
      >
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
    </div>
  );
}
