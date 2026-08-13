"use client";

import { useId } from "react";

type IllustrationProps = {
  className?: string;
};

function Frame({
  children,
  className,
  gradId,
  stops,
}: {
  children: React.ReactNode;
  className?: string;
  gradId: string;
  stops: [string, string];
}) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="100%" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gradId})`} />
      {children}
    </svg>
  );
}

/** Abstract stadium bowl under floodlights. */
export function StadiumIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0a1730", "#04070f"]}>
      <ellipse cx="200" cy="330" rx="260" ry="150" fill="none" stroke="#1c3457" strokeWidth="10" />
      <ellipse cx="200" cy="330" rx="210" ry="118" fill="none" stroke="#25406b" strokeWidth="6" />
      <ellipse cx="200" cy="245" rx="150" ry="46" fill="#0f5c3f" opacity="0.9" />
      <ellipse cx="200" cy="245" rx="150" ry="46" fill="none" stroke="#3fc1ff" strokeOpacity="0.35" strokeWidth="2" />
      <line x1="200" y1="199" x2="200" y2="291" stroke="#3fc1ff" strokeOpacity="0.35" strokeWidth="2" />
      <ellipse cx="200" cy="245" rx="28" ry="9" fill="none" stroke="#3fc1ff" strokeOpacity="0.35" strokeWidth="2" />
      {[[46, 210], [354, 210], [70, 120], [330, 120]].map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={200 + (x - 200) * 0.15} y2={y + 90} stroke="#12213c" strokeWidth="4" />
          <circle cx={x} cy={y} r="10" fill="#ffb703" opacity="0.9" />
          <circle cx={x} cy={y} r="22" fill="#ffb703" opacity="0.18" />
        </g>
      ))}
      <circle cx="330" cy="45" r="26" fill="#ffb703" opacity="0.9" />
      <circle cx="330" cy="45" r="46" fill="#ffb703" opacity="0.12" />
    </Frame>
  );
}

/** Ball with a radiating sun/star burst — Vélodrome sunset mood. */
export function BallStarIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#062a4d", "#04101f"]}>
      <g stroke="#ffb703" strokeOpacity="0.5" strokeWidth="2">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 200 + Math.cos(a) * 70;
          const y1 = 140 + Math.sin(a) * 70;
          const x2 = 200 + Math.cos(a) * 150;
          const y2 = 140 + Math.sin(a) * 150;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx="200" cy="140" r="58" fill="#f5f7fa" />
      <g stroke="#0a1730" strokeWidth="3" fill="none">
        <polygon points="200,104 216,116 210,135 190,135 184,116" fill="#0a1730" />
        <path d="M200,104 L200,84" />
        <path d="M216,116 L238,104" />
        <path d="M210,135 L222,158" />
        <path d="M190,135 L178,158" />
        <path d="M184,116 L162,104" />
        <circle cx="200" cy="140" r="58" fill="none" />
      </g>
      <ellipse cx="200" cy="252" rx="120" ry="16" fill="#3fc1ff" opacity="0.15" />
    </Frame>
  );
}

/** Abstract jersey with a number. */
export function JerseyIllustration({ className, number = 10 }: IllustrationProps & { number?: number }) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0d1a2b", "#040a15"]}>
      <path
        d="M140 70 L170 55 L200 75 L230 55 L260 70 L280 110 L250 128 L245 110 L245 235 Q245 250 230 250 L170 250 Q155 250 155 235 L155 110 L150 128 L120 110 Z"
        fill="#3fc1ff"
        opacity="0.14"
        stroke="#3fc1ff"
        strokeWidth="3"
      />
      <text
        x="200"
        y="185"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="86"
        fill="#f5f7fa"
      >
        {number}
      </text>
      <circle cx="200" cy="55" r="6" fill="#ffb703" />
    </Frame>
  );
}

/** Two crossing arrows — transfers in / out. */
export function TransferIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0a1730", "#050b16"]}>
      <g strokeLinecap="round">
        <path d="M70 210 C 150 210, 170 90, 260 90" fill="none" stroke="#3fc1ff" strokeWidth="4" strokeDasharray="2 12" opacity="0.7" />
        <polygon points="260,90 240,80 244,102" fill="#3fc1ff" />
        <path d="M330 210 C 250 210, 230 90, 140 90" fill="none" stroke="#ffb703" strokeWidth="4" strokeDasharray="2 12" opacity="0.7" />
        <polygon points="140,90 160,80 156,102" fill="#ffb703" />
      </g>
      <circle cx="70" cy="210" r="9" fill="#f5f7fa" />
      <circle cx="330" cy="210" r="9" fill="#f5f7fa" />
    </Frame>
  );
}

/** Microphone with sound waves — press conference. */
export function PressIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0d1a2b", "#04070f"]}>
      <rect x="176" y="70" width="48" height="90" rx="24" fill="#f5f7fa" opacity="0.92" />
      <path d="M150 130 a50 50 0 0 0 100 0" fill="none" stroke="#3fc1ff" strokeWidth="6" strokeLinecap="round" />
      <line x1="200" y1="180" x2="200" y2="215" stroke="#3fc1ff" strokeWidth="6" strokeLinecap="round" />
      <line x1="165" y1="215" x2="235" y2="215" stroke="#3fc1ff" strokeWidth="6" strokeLinecap="round" />
      {[26, 46, 66].map((r, i) => (
        <path
          key={i}
          d={`M ${140 - r * 0.6} ${110} a ${r} ${r} 0 0 1 0 ${40}`}
          fill="none"
          stroke="#ffb703"
          strokeOpacity={0.55 - i * 0.15}
          strokeWidth="3"
        />
      ))}
    </Frame>
  );
}

/** Calendar grid with one date highlighted. */
export function CalendarIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0a1730", "#050b16"]}>
      <rect x="90" y="70" width="220" height="180" rx="14" fill="#0d1a2b" stroke="#25406b" strokeWidth="3" />
      <rect x="90" y="70" width="220" height="42" rx="14" fill="#3fc1ff" opacity="0.85" />
      <line x1="130" y1="55" x2="130" y2="90" stroke="#f5f7fa" strokeWidth="6" strokeLinecap="round" />
      <line x1="270" y1="55" x2="270" y2="90" stroke="#f5f7fa" strokeWidth="6" strokeLinecap="round" />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => {
          const x = 116 + col * 38;
          const y = 138 + row * 26;
          const active = row === 1 && col === 2;
          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width="26"
              height="16"
              rx="4"
              fill={active ? "#ffb703" : "#1c3457"}
            />
          );
        })
      )}
    </Frame>
  );
}

/** Tifo crowd — triangular flags + flares. */
export function CrowdIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#04101f", "#02060c"]}>
      <g>
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 20 + i * 42;
          const colors = ["#3fc1ff", "#f5f7fa", "#0a1730"];
          return (
            <polygon
              key={i}
              points={`${x},260 ${x + 21},170 ${x + 42},260`}
              fill={colors[i % colors.length]}
              opacity={colors[i % colors.length] === "#0a1730" ? 0.6 : 0.85}
            />
          );
        })}
      </g>
      {[80, 200, 320].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy="150" rx="10" ry="22" fill="#ffb703" opacity="0.85" />
          <ellipse cx={x} cy="150" rx="22" ry="40" fill="#ffb703" opacity="0.18" />
        </g>
      ))}
    </Frame>
  );
}

/** Trophy silhouette with a sparkle. */
export function TrophyIllustration({ className }: IllustrationProps) {
  const id = useId();
  return (
    <Frame className={className} gradId={`grad-${id}`} stops={["#0a1730", "#04070f"]}>
      <g fill="#ffb703">
        <path d="M170 90 h60 v60 a30 30 0 0 1 -60 0 z" opacity="0.95" />
        <rect x="188" y="150" width="24" height="34" />
        <rect x="164" y="184" width="72" height="14" rx="6" />
      </g>
      <path d="M170 100 c-30 0 -34 40 -4 46" fill="none" stroke="#ffb703" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d="M230 100 c30 0 34 40 4 46" fill="none" stroke="#ffb703" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <g stroke="#f5f7fa" strokeWidth="3" strokeLinecap="round">
        <line x1="290" y1="70" x2="290" y2="92" />
        <line x1="279" y1="81" x2="301" y2="81" />
      </g>
    </Frame>
  );
}

export const illustrationByKey = {
  stadium: StadiumIllustration,
  ball: BallStarIllustration,
  jersey: JerseyIllustration,
  transfer: TransferIllustration,
  press: PressIllustration,
  calendar: CalendarIllustration,
  crowd: CrowdIllustration,
  trophy: TrophyIllustration,
} as const;

export type IllustrationKey = keyof typeof illustrationByKey;
