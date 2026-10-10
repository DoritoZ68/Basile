import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { ringPath } from '@/lib/rings';

export type RingSession = { key: string; color: string; minutes: number };

type Props = {
  size: number;
  /** Séances terminées, du cœur vers l'écorce. Chaque séance forme un cerne. */
  sessions: RingSession[];
  /** Séance en cours : son cerne se dessine au fil du minuteur. */
  growing?: { color: string; minutes: number; progress: number };
  /** Objectif du jour, dessiné en pointillés : le tronc pousse jusqu'à lui. */
  goalMinutes?: number;
  strokeWidth?: number;
};

/**
 * La signature de Bûcheur : la journée de révision vue comme une rondelle de bois.
 * L'épaisseur de chaque cerne est proportionnelle à la durée de la séance.
 */
export function TreeRings({ size, sessions, growing, goalMinutes = 0, strokeWidth = 2.5 }: Props) {
  const theme = useTheme();
  const maxR = size / 2 - strokeWidth * 2;
  const core = Math.max(3, maxR * 0.08);
  // Les cernes sont légèrement excentrés : on recentre l'ensemble.
  const cx = size / 2 - maxR * 0.03;
  const cy = size / 2 - maxR * 0.015;

  const done = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const total = Math.max(goalMinutes, done + (growing?.minutes ?? 0), 1);
  const scale = (maxR * 0.94 - core) / total;

  const rings = sessions.map((s, i) => {
    const upTo = sessions.slice(0, i + 1).reduce((sum, x) => sum + x.minutes, 0);
    return { ...s, index: i, r: core + upTo * scale };
  });
  const outer = rings.at(-1)?.r ?? core;
  const growR = growing ? outer + growing.minutes * scale : 0;

  return (
    <Svg width={size} height={size}>
      {goalMinutes > 0 && (
        <Path
          d={ringPath(cx, cy, core + goalMinutes * scale, rings.length + 1)}
          fill="none"
          stroke={theme.textSecondary}
          strokeOpacity={0.45}
          strokeWidth={1}
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
      )}

      {growing && (
        <Path
          d={ringPath(cx, cy, growR, rings.length)}
          fill="none"
          stroke={growing.color}
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="1 4"
        />
      )}

      {/* Bandes colorées, de l'écorce vers le cœur pour que chaque cerne recouvre le suivant. */}
      {[...rings].reverse().map((ring) => {
        const d = ringPath(cx, cy, ring.r, ring.index);
        return (
          <G key={`band-${ring.key}`}>
            <Path d={d} fill={theme.wood} />
            <Path d={d} fill={ring.color} fillOpacity={0.14} />
          </G>
        );
      })}

      {rings.map((ring) => (
        <Path
          key={ring.key}
          d={ringPath(cx, cy, ring.r, ring.index)}
          fill="none"
          stroke={ring.color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      ))}

      {growing && growing.progress > 0 && (
        <Path
          d={ringPath(cx, cy, growR, rings.length, growing.progress)}
          fill="none"
          stroke={growing.color}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      <Circle cx={cx} cy={cy} r={Math.max(1.5, core * 0.45)} fill={theme.textSecondary} />
    </Svg>
  );
}
