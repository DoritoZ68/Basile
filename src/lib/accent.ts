export type Accent = "blue" | "violet" | "coral" | "teal";

export const ACCENT: Record<Accent, { text: string; bg: string; tint: string; ring: string; dot: string }> = {
  blue: { text: "text-blue", bg: "bg-blue", tint: "bg-blue-tint", ring: "ring-blue/25", dot: "bg-blue" },
  violet: { text: "text-violet", bg: "bg-violet", tint: "bg-violet-tint", ring: "ring-violet/25", dot: "bg-violet" },
  coral: { text: "text-coral", bg: "bg-coral", tint: "bg-coral-tint", ring: "ring-coral/25", dot: "bg-coral" },
  teal: { text: "text-teal", bg: "bg-teal", tint: "bg-teal-tint", ring: "ring-teal/25", dot: "bg-teal" },
};
