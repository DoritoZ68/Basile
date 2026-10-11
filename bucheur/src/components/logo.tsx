import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Display } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Le logo : une petite rondelle de bois (les cernes) et le nom en Fraunces. */
export function Logo({ size = 28, showName = true }: { size?: number; showName?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.logo}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Circle cx={16} cy={16} r={15} fill={theme.accent} />
        <Circle cx={16.5} cy={16} r={11} fill="none" stroke="#F4EBDA" strokeWidth={1.6} />
        <Circle cx={16} cy={16.5} r={7} fill="none" stroke="#F4EBDA" strokeWidth={1.6} />
        <Circle cx={16.3} cy={16.2} r={3} fill="#F4EBDA" />
      </Svg>
      {showName && <ThemedText style={styles.name}>Bûcheur</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 21,
    lineHeight: 26,
  },
});
