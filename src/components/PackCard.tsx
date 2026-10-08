import Link from "next/link";
import { packCourses, packValue, type Pack } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { CourseCover } from "@/components/CourseCover";
import { AddToCartButton } from "@/components/AddToCartButton";
import { CheckIcon } from "@/components/Icon";

export function PackCard({ pack, compact = false }: { pack: Pack; compact?: boolean }) {
  const included = packCourses(pack);
  const value = packValue(pack);
  const saving = value - pack.price;
  const savingPct = Math.round((saving / value) * 100);
  const listed = compact ? included.slice(0, 4) : included;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-bg p-6 ${
        pack.highlight ? "border-brand shadow-[0_16px_40px_-20px_rgba(79,70,229,0.55)]" : "border-line"
      }`}
    >
      {pack.highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">
          Le plus choisi
        </span>
      )}
      <div className="flex items-center gap-4">
        <CourseCover icon={pack.icon} category={null} size="sm" className="h-12 w-12 shrink-0 rounded-xl" />
        <div>
          <h3 className="font-display text-lg text-ink">{pack.title}</h3>
          <p className="text-sm text-ink-soft">{pack.tagline}</p>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-3">
        <span className="font-display text-3xl text-ink">{formatPrice(pack.price)}</span>
        <span className="text-sm text-ink-faint line-through">{formatPrice(value)}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-green">
        {formatPrice(saving)} d&apos;économie (−{savingPct} %) par rapport à l&apos;achat séparé
      </p>

      {!compact && <p className="mt-4 text-sm text-ink-soft">{pack.description}</p>}

      <ul className="mt-5 space-y-2.5 text-sm">
        {listed.map((c) => (
          <li key={c.slug} className="flex gap-2.5">
            <CheckIcon className="mt-0.5 shrink-0 text-green" />
            <Link href={`/formations/${c.slug}`} className="text-ink hover:text-brand">
              {c.title}
            </Link>
          </li>
        ))}
        {listed.length < included.length && (
          <li className="pl-7 text-ink-faint">+ {included.length - listed.length} autres formations</li>
        )}
      </ul>

      <div className="mt-auto pt-6">
        <AddToCartButton id={pack.slug} label="Choisir ce pack" className="w-full" />
      </div>
    </article>
  );
}
