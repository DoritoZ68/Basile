import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Glass } from './glass';
import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';

type IconName = 'timer' | 'books' | 'calendar' | 'chart';

/**
 * Version web de la barre d'onglets : une capsule de verre flottante en bas de l'écran,
 * comme la barre Liquid Glass d'iOS 26 (sur iPhone, c'est la barre native qui s'affiche).
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="timer">Focus</TabButton>
          </TabTrigger>
          <TabTrigger name="matieres" href="/matieres" asChild>
            <TabButton icon="books">Matières</TabButton>
          </TabTrigger>
          <TabTrigger name="examens" href="/examens" asChild>
            <TabButton icon="calendar">Examens</TabButton>
          </TabTrigger>
          <TabTrigger name="stats" href="/stats" asChild>
            <TabButton icon="chart">Stats</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tab,
        isFocused && { backgroundColor: theme.glass },
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}>
      <TabIcon name={icon} color={color} />
      <ThemedText type="smallBold" style={[styles.label, { color }]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.container} pointerEvents="box-none">
      <Glass style={styles.bar}>{props.children}</Glass>
    </View>
  );
}

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'timer' && (
        <>
          <Circle cx={12} cy={13.5} r={7.5} fill="none" stroke={color} strokeWidth={2} />
          <Path d="M12 13.5V9.5M9.5 3h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {name === 'books' && (
        <>
          <Rect x={4} y={4} width={4.5} height={16} rx={1} fill={color} />
          <Rect x={10} y={4} width={4.5} height={16} rx={1} fill={color} />
          <Rect
            x={15.5}
            y={5}
            width={4.5}
            height={15.5}
            rx={1}
            fill={color}
            rotation={-12}
            origin="17.75, 12.75"
          />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect
            x={3.5}
            y={5}
            width={17}
            height={15}
            rx={3}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
          <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {name === 'chart' && (
        <>
          <Rect x={4} y={12} width={4} height={8} rx={1} fill={color} />
          <Rect x={10} y={7} width={4} height={13} rx={1} fill={color} />
          <Rect x={16} y={4} width={4} height={16} rx={1} fill={color} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 440,
    padding: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});
