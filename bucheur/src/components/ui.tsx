import { Children, Fragment, type ReactNode } from 'react';
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

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export function Screen({ title, subtitle, children }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.inner}>
          {(title || subtitle) && (
            <View style={styles.header}>
              {subtitle && (
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle}
                </ThemedText>
              )}
              {title && <ThemedText style={styles.screenTitle}>{title}</ThemedText>}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Liste groupée façon iOS : un fond discret et un séparateur fin entre les lignes. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View style={[styles.group, { backgroundColor: theme.backgroundElement }, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  label: string;
  value?: string;
  detail?: string;
  color?: string;
  onPress?: () => void;
  valueColor?: string;
};

export function Row({ label, value, detail, color, onPress, valueColor }: RowProps) {
  const content = (
    <View style={styles.row}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        {detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {value !== undefined && (
        <ThemedText
          themeColor="textSecondary"
          style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </ThemedText>
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `plain` et `danger` sont des boutons texte, sans fond. */
  variant?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const theme = useTheme();
  const filled = variant === 'primary';
  const color = filled ? theme.accentText : variant === 'danger' ? theme.danger : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        filled ? styles.button : styles.textButton,
        filled && { backgroundColor: theme.accent },
        { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <ThemedText style={[filled ? styles.buttonLabel : styles.textButtonLabel, { color }]}>
        {label}
      </ThemedText>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.backgroundElement : 'transparent',
          borderColor: selected ? (color ?? theme.text) : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <ThemedText
        type={selected ? 'smallBold' : 'small'}
        themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type SegmentedProps<T extends string | number> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string | number>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText
              type={selected ? 'smallBold' : 'small'}
              themeColor={selected ? 'text' : 'textSecondary'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
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
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, styles.rowText]}>{label}</ThemedText>
      <View style={[styles.stepperControls, { backgroundColor: theme.backgroundSelected }]}>
        <StepButton label="−" onPress={onMinus} />
        <ThemedText type="smallBold" style={styles.stepperValue}>
          {value}
        </ThemedText>
        <StepButton label="+" onPress={onPlus} />
      </View>
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Augmenter' : 'Diminuer'}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
      <ThemedText style={styles.stepButtonLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    // Sur le web, la barre d'onglets est en haut de l'écran.
    paddingTop: Platform.OS === 'web' ? 88 : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    marginBottom: Spacing.two,
  },
  screenTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  group: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 400,
  },
  rowValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 400,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: 600,
  },
  textButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: 500,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepButton: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonLabel: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 400,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: -Spacing.one,
    marginLeft: Spacing.three,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
