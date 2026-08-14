"use client";

import { useState } from "react";
import type { Category, Story } from "@/lib/content";
import { CATEGORIES } from "@/lib/content";
import { ACCENT } from "@/lib/accent";
import { StoryCard } from "@/components/StoryCard";

const TABS: (Category | "tous")[] = ["tous", "om", "ville", "culture", "mer"];

export function CategoryFilterGrid({ stories }: { stories: Story[] }) {
  const [active, setActive] = useState<Category | "tous">("tous");
  const filtered = active === "tous" ? stories : stories.filter((s) => s.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab === active;
          const accent = tab === "tous" ? null : ACCENT[CATEGORIES[tab].accent];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? accent
                    ? `${accent.bg} border-transparent text-white`
                    : "border-transparent bg-ink text-bg"
                  : "border-line bg-bg text-ink-soft hover:border-ink-faint"
              }`}
            >
              {tab === "tous" ? "Tout" : CATEGORIES[tab].label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {filtered.map((story) => (
          <StoryCard key={story.slug} story={story} />
        ))}
      </div>
    </div>
  );
}
