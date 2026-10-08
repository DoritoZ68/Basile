import type { CategoryKey } from "@/lib/catalog";

/** Literal class names per category (Tailwind needs to see them in full). */
export const ACCENT: Record<CategoryKey, { text: string; bg: string; tint: string; cover: string }> = {
  ia: {
    text: "text-violet",
    bg: "bg-violet",
    tint: "bg-violet-tint",
    cover: "from-[#2a1d6b] via-[#4b2fb0] to-[#8b6cf0]",
  },
  business: {
    text: "text-coral",
    bg: "bg-coral",
    tint: "bg-coral-tint",
    cover: "from-[#5a1f0c] via-[#b24a1d] to-[#f0935f]",
  },
  marketing: {
    text: "text-blue",
    bg: "bg-blue",
    tint: "bg-blue-tint",
    cover: "from-[#0d2b4a] via-[#1f5f94] to-[#5fb0e3]",
  },
  tech: {
    text: "text-teal",
    bg: "bg-teal",
    tint: "bg-teal-tint",
    cover: "from-[#06322f] via-[#13756f] to-[#4fd0c6]",
  },
};

export const PACK_COVER = "from-[#14123a] via-[#3730a3] to-[#7c74ff]";
