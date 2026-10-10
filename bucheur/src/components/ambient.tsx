import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Fond d'ambiance : de grands halos doux (accent, bois, ciel) qui donnent au verre
 * quelque chose à réfracter. L'accent suit l'essence de bois choisie.
 */
export function Ambient() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  // Identifiants uniques : sur le web, tous les écrans restent dans la même page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const strength = dark ? 0.32 : 0.42;
  const halos = [
    { id: `${uid}a`, cx: '12%', cy: '6%', r: '62%', color: theme.accent },
    { id: `${uid}b`, cx: '100%', cy: '42%', r: '58%', color: dark ? '#B98552' : '#D9A86C' },
    { id: `${uid}c`, cx: '18%', cy: '96%', r: '60%', color: dark ? '#4F6E8C' : '#9DB8CF' },
  ];
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <Svg width="100%" height="100%">
        <Defs>
          {halos.map((h) => (
            <RadialGradient
              key={h.id}
              id={h.id}
              cx={h.cx}
              cy={h.cy}
              rx={h.r}
              ry={h.r}
              fx={h.cx}
              fy={h.cy}>
              <Stop offset="0" stopColor={h.color} stopOpacity={strength} />
              <Stop offset="1" stopColor={h.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {halos.map((h) => (
          <Rect key={h.id} width="100%" height="100%" fill={`url(#${h.id})`} />
        ))}
      </Svg>
    </View>
  );
}
