import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  /** Avancement de 0 à 1. */
  progress: number;
  color: string;
  strokeWidth?: number;
};

/**
 * Jauge de séance : un anneau qui se remplit autour du tronc, avec un point lumineux
 * à l'extrémité. Mise à jour chaque seconde, le mouvement reste continu à l'œil.
 */
export function ProgressGauge({ size, progress, color, strokeWidth = 8 }: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2 - 4;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const angle = -Math.PI / 2 + p * 2 * Math.PI;
  const head = { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.16}
          strokeWidth={strokeWidth}
        />
        {p > 0 && (
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - p)}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
        {p > 0 && p < 1 && (
          <>
            <Circle cx={head.x} cy={head.y} r={strokeWidth * 1.4} fill={color} fillOpacity={0.25} />
            <Circle cx={head.x} cy={head.y} r={strokeWidth * 0.55} fill="#FFFFFF" />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
