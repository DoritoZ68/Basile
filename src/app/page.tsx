import { getAllStoriesDesc } from "@/lib/content";
import { TodayStrip } from "@/components/TodayStrip";
import { StoryBubbles } from "@/components/StoryBubbles";
import { CategoryFilterGrid } from "@/components/CategoryFilterGrid";

export default function Home() {
  const allStories = getAllStoriesDesc();

  return (
    <div>
      <TodayStrip />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <StoryBubbles stories={allStories} />

        <div className="mt-8">
          <CategoryFilterGrid stories={allStories} />
        </div>
      </div>
    </div>
  );
}
