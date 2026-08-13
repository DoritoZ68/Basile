import Link from "next/link";
import Image from "next/image";
import type { Story } from "@/lib/content";
import { CATEGORIES } from "@/lib/content";
import { ACCENT } from "@/lib/accent";

export function StoryBubbles({ stories }: { stories: Story[] }) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto scroll-smooth px-4 pb-1 scrollbar-none sm:-mx-6 sm:px-6">
      {stories.map((story) => {
        const accent = ACCENT[CATEGORIES[story.category].accent];
        return (
          <Link
            key={story.slug}
            href={`/histoire/${story.slug}`}
            className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
          >
            <span className={`rounded-full p-[3px] ${accent.bg}`}>
              <span className="block rounded-full bg-bg p-[3px]">
                <span className="relative block h-14 w-14 overflow-hidden rounded-full">
                  <Image src={story.cover.src} alt="" fill sizes="56px" className="object-cover" />
                </span>
              </span>
            </span>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink-soft">
              {story.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
