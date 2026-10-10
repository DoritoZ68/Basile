import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.inner}>
          <ThemedText style={styles.screenTitle}>{title}</ThemedText>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.accent : variant === 'danger' ? 'transparent' : theme.backgroundSelected;
  const color =
    variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <ThemedText style={[styles.buttonLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  color?: string;
  onPress: () => void;
};

export function Chip({ label, selected, color, onPress }: ChipProps) {
  const theme = useTheme();
  const active = color ?? theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? active : theme.border,
          backgroundColor: selected ? active : theme.backgroundElement,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {color && !selected && <View style={[styles.dot, { backgroundColor: color }]} />}
      <ThemedText
        type="smallBold"
        style={{ color: selected ? (color ? '#FFFFFF' : theme.accentText) : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? theme.accent }]} />
    </View>
  );
}

type StepperProps = {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
};

export function Stepper({ label, value, onMinus, onPlus }: StepperProps) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.stepperLabel}>
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <StepButton label="−" onPress={onMinus} background={theme.backgroundSelected} />
        <ThemedText type="smallBold" style={styles.stepperValue}>
          {value}
        </ThemedText>
        <StepButton label="+" onPress={onPlus} background={theme.backgroundSelected} />
      </View>
    </View>
  );
}

function StepButton({ label, onPress, background }: { label: string; onPress: () => void; background: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Augmenter' : 'Diminuer'}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.stepButton, { backgroundColor: background, opacity: pressed ? 0.7 : 1 }]}>
      <ThemedText style={styles.stepButtonLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    // Sur le web, la barre d'onglets est en haut de l'écran.
    paddingTop: Platform.OS === 'web' ? 88 : Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  screenTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: 700,
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: 700,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stepperLabel: {
    flexShrink: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepperValue: {
    minWidth: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonLabel: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 600,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.two,
    marginBottom: -Spacing.two,
  },
});
