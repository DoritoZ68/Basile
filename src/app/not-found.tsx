import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">Cette page n&apos;existe pas (ou plus).</h1>
      <p className="mt-2 text-ink-soft">La formation que vous cherchez a peut-être changé d&apos;adresse.</p>
      <Link
        href="/formations"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand"
      >
        Voir toutes les formations
      </Link>
    </div>
  );
}
