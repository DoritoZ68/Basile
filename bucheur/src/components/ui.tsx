import { useFocusEffect } from 'expo-router';
import { Children, Fragment, useCallback, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Display, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Bouton affiché à droite du titre (réglages…). */
  action?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, subtitle, action, children }: ScreenProps) {
  // Sur le web, l'écran apparaît en fondu léger quand on change d'onglet. Sur iPhone, la barre
  // d'onglets native gère déjà la transition (et l'opacité perturberait le Liquid Glass).
  const enter = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web') return;
      enter.set(0);
      enter.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    }, [enter]),
  );
  const enterStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * enter.get(),
    transform: [{ translateY: (1 - enter.get()) * 10 }],
  }));

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Ambient />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Animated.View style={[styles.inner, enterStyle]}>
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {subtitle && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {subtitle}
                  </ThemedText>
                )}
                {title && <ThemedText style={styles.screenTitle}>{title}</ThemedText>}
              </View>
              {action}
            </View>
          )}
          {children}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Liste groupée façon iOS, sur une plaque de verre, avec un séparateur fin entre les lignes. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <Glass style={[styles.group, style]}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          {child}
        </Fragment>
      ))}
    </Glass>
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * `primary` : verre teinté de l'accent. `glass` : capsule de verre neutre.
   * `plain` et `danger` : boutons texte, sans fond.
   */
  variant?: 'primary' | 'glass' | 'plain' | 'danger';
  /** Couleur du texte d'un bouton `glass` (accent par défaut). */
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  disabled,
  style,
}: ButtonProps) {
  const theme = useTheme();

  if (variant === 'primary' || variant === 'glass') {
    const primary = variant === 'primary' && !disabled;
    const textColor = primary
      ? theme.accentText
      : disabled
        ? theme.textSecondary
        : (color ?? theme.accent);
    // Pas d'opacité sur le verre (il disparaîtrait) : on réduit légèrement le bouton au toucher.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
        <Glass
          interactive
          tint={primary ? theme.accent : undefined}
          style={[styles.button, variant === 'glass' && styles.glassButton]}>
          <ThemedText style={[styles.buttonLabel, { color: textColor }]}>{label}</ThemedText>
        </Glass>
      </Pressable>
    );
  }

  const textColor = variant === 'danger' ? theme.danger : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.textButton,
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        style,
      ]}>
      <ThemedText style={[styles.textButtonLabel, { color: textColor }]}>{label}</ThemedText>
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
  // Sélectionnée : verre teinté de la couleur de la matière (ou de l'accent), texte blanc.
  const tint = selected ? (color ?? theme.accent) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Glass interactive tint={tint} style={styles.chip}>
        {color && !selected && <View style={[styles.dot, { backgroundColor: color }]} />}
        <ThemedText
          type={selected ? 'smallBold' : 'small'}
          style={{ color: selected ? '#FFFFFF' : theme.text }}>
          {label}
        </ThemedText>
      </Glass>
    </Pressable>
  );
}

type SegmentedProps<T extends string | number> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <Glass style={styles.segmented}>
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
    </Glass>
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

type ToggleRowProps = {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Ligne de réglage avec un interrupteur. */
export function ToggleRow({ label, detail, value, onChange }: ToggleRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/** Bouton rond en verre avec une icône (réglages…). */
export function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <Glass interactive style={styles.iconButton}>
        {children}
      </Glass>
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
    paddingTop: Platform.OS === 'web' ? Spacing.five : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  screenTitle: {
    fontFamily: Display.title,
    // Avec une police personnalisée, un fontWeight explicite peut faire retomber sur la police système.
    fontWeight: 'normal',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.3,
  },
  group: {
    borderRadius: 26,
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
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassButton: {
    minHeight: 48,
    paddingHorizontal: 22,
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
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
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
    borderRadius: 999,
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
