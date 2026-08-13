import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getAllStoriesDesc, getStory, stories, CATEGORIES } from "@/lib/content";
import { StoryViewer } from "@/components/StoryViewer";
import { formatFullDate } from "@/lib/date";

export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  return {
    title: story.title,
    description: story.points.join(" "),
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  return (
    <>
      {/* SEO / no-JS fallback — the interactive viewer below covers this for JS users. */}
      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold text-blue">{CATEGORIES[story.category].label}</p>
        <h1 className="mt-2 font-display text-2xl text-ink">{story.title}</h1>
        <p className="mt-1 text-sm text-ink-faint">{formatFullDate(story.publishedAt)}</p>
        <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <Image src={story.cover.src} alt={story.cover.alt} fill className="object-cover" />
        </div>
        <ol className="mt-6 space-y-3">
          {story.points.map((point, i) => (
            <li key={i} className="text-ink-soft">
              {i + 1}. {point}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-ink-soft">{story.more}</p>
      </article>

      <StoryViewer stories={getAllStoriesDesc()} initialSlug={story.slug} />
    </>
  );
}
