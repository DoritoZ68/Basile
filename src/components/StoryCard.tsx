import Link from "next/link";
import Image from "next/image";
import type { Story } from "@/lib/content";
import { CATEGORIES } from "@/lib/content";
import { ACCENT } from "@/lib/accent";

export function StoryCard({ story, big = false }: { story: Story; big?: boolean }) {
  const accent = ACCENT[CATEGORIES[story.category].accent];

  return (
    <Link
      href={`/histoire/${story.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-line bg-surface"
    >
      <div className={`relative w-full ${big ? "aspect-[4/3]" : "aspect-square"}`}>
        <Image
          src={story.cover.src}
          alt={story.cover.alt}
          fill
          sizes={big ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 320px, 50vw"}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
          <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${accent.bg}`}>
            {CATEGORIES[story.category].label}
          </span>
          <h3 className={`text-balance font-display leading-tight text-white ${big ? "text-xl sm:text-2xl" : "text-base"}`}>
            {story.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
