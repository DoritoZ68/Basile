"use client";

import { useState } from "react";

export function NewsletterSignup({ variant = "card" }: { variant?: "card" | "inline" }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
  }

  const wrapperClass =
    variant === "card"
      ? "rounded-2xl border border-line bg-panel/60 p-5"
      : "rounded-3xl border border-line bg-panel/50 p-8 sm:p-10";

  return (
    <div className={wrapperClass}>
      <p className="font-display text-xs tracking-wide text-sky">Newsletter</p>
      <h3 className="mt-2 text-balance font-display text-lg text-white sm:text-xl">
        L&apos;actu OM en 3 points, dans votre boîte mail
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-mist-dim">
        Un envoi par semaine, jamais plus. Zéro spam, promis.
      </p>

      {sent ? (
        <p className="mt-4 rounded-xl border border-teal/25 bg-teal/10 px-4 py-3 text-sm text-teal">
          Merci ! Vous recevrez la prochaine édition à {email}.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            className="min-w-0 flex-1 rounded-full border border-line bg-ink/60 px-4 py-2.5 text-sm text-white placeholder:text-mist-dim focus:border-sky focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-sky px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
          >
            S&apos;abonner
          </button>
        </form>
      )}
      <p className="mt-3 text-[11px] text-mist-dim">
        Formulaire de démonstration — aucun e-mail n&apos;est réellement envoyé.
      </p>
    </div>
  );
}
