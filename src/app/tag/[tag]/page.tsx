import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllTags, getArticlesByTag } from "@/lib/content";
import { ArticleCard } from "@/components/ArticleCard";

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const items = getArticlesByTag(decoded);
  if (items.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Link href="/" className="text-sm font-semibold text-sky hover:text-white">
        ← Retour à l&apos;accueil
      </Link>
      <p className="mt-6 font-display text-xs tracking-[0.2em] text-sky">Sujet</p>
      <h1 className="mt-1 text-balance font-display text-2xl text-white sm:text-3xl">
        #{decoded}
      </h1>
      <p className="mt-2 text-sm text-mist-dim">
        {items.length} article{items.length > 1 ? "s" : ""}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
