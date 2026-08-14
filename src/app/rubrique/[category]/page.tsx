import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { CATEGORIES, getStoriesByCategory, type Category } from "@/lib/content";
import { ACCENT } from "@/lib/accent";
import { StoryCard } from "@/components/StoryCard";
import { NextMatchCard } from "@/components/NextMatchCard";

const SLUGS: Category[] = ["om", "ville", "culture", "mer"];

export function generateStaticParams() {
  return SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!SLUGS.includes(category as Category)) return {};
  const meta = CATEGORIES[category as Category];
  return { title: meta.label, description: meta.description };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!SLUGS.includes(category as Category)) notFound();

  const cat = category as Category;
  const meta = CATEGORIES[cat];
  const accent = ACCENT[meta.accent];
  const items = getStoriesByCategory(cat);

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        <Image src={meta.cover.src} alt={meta.cover.alt} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${accent.bg}`}>
            {items.length} histoire{items.length > 1 ? "s" : ""}
          </span>
          <h1 className="mt-3 text-balance font-display text-3xl text-white sm:text-4xl">{meta.label}</h1>
          <p className="mt-2 max-w-md text-sm text-white/85">{meta.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {cat === "om" && (
          <div className="mb-8 max-w-sm">
            <NextMatchCard />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </div>
    </div>
  );
}
