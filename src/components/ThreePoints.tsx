type ThreePointsProps = {
  points: readonly [string, string, string];
  size?: "sm" | "md" | "lg";
  tone?: "dark" | "light";
};

const SIZES = {
  sm: { num: "h-6 w-6 text-xs", text: "text-sm", gap: "gap-2.5" },
  md: { num: "h-8 w-8 text-sm", text: "text-[15px]", gap: "gap-3" },
  lg: { num: "h-9 w-9 text-base", text: "text-base", gap: "gap-3.5" },
};

export function ThreePoints({ points, size = "md", tone = "dark" }: ThreePointsProps) {
  const s = SIZES[size];
  return (
    <ol className={`flex flex-col ${size === "lg" ? "gap-4" : "gap-3"}`}>
      {points.map((point, i) => (
        <li key={i} className={`flex items-start ${s.gap}`}>
          <span
            className={`font-display flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-strong text-ink ${s.num}`}
          >
            {i + 1}
          </span>
          <span
            className={`${s.text} leading-snug ${tone === "dark" ? "text-mist" : "text-white/90"}`}
          >
            {point}
          </span>
        </li>
      ))}
    </ol>
  );
}
