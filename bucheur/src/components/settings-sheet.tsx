import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Ambient } from '@/components/ambient';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Chip,
  Group,
  IconButton,
  Row,
  Segmented,
  SectionTitle,
  Stepper,
  ToggleRow,
} from '@/components/ui';
import { Display, Essences, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { maskKey } from '@/lib/license';
import { usePro } from '@/lib/pro';
import { formatDuration } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Appearance, EssenceId } from '@/lib/types';

/** Au-delà de cette durée, une séance fait partie de Bûcheur Pro. */
export const FREE_MAX_FOCUS = 60;
const MAX_FOCUS = 120;

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];
const BREAKS = [5, 10, 15, 20].map((m) => ({ value: m, label: `${m} min` }));

/** Bouton « Réglages » (icône de curseurs) qui ouvre la feuille de réglages. */
export function SettingsButton() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="Réglages" onPress={() => setOpen(true)}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M4 7h9M17 7h3M4 17h3M11 17h9"
            stroke={theme.text}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={15} cy={7} r={2.4} fill="none" stroke={theme.text} strokeWidth={2} />
          <Circle cx={9} cy={17} r={2.4} fill="none" stroke={theme.text} strokeWidth={2} />
        </Svg>
      </IconButton>
      <SettingsSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { settings, updateSettings, resetAll } = useStore();
  const { isPro, price, channel, licenseKey, openPaywall } = usePro();
  const [confirmReset, setConfirmReset] = useState(false);

  // Le paywall s'ouvre par-dessus : on ferme d'abord les réglages.
  const askPro = () => {
    onClose();
    openPaywall();
  };
  const close = () => {
    setConfirmReset(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <Ambient />
        <View style={styles.topBar}>
          <ThemedText style={styles.title}>Réglages</ThemedText>
          <Button label="OK" variant="glass" onPress={close} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SectionTitle>Apparence</SectionTitle>
          <Segmented
            options={APPEARANCES}
            value={settings.appearance}
            onChange={(appearance) => updateSettings({ appearance })}
          />
          <Group>
            <View style={styles.block}>
              <ThemedText style={styles.label}>Essence de bois</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                La couleur des boutons, du fond et des cernes en cours.
              </ThemedText>
              <View style={styles.chips}>
                {(Object.keys(Essences) as EssenceId[]).map((id) => (
                  <Chip
                    key={id}
                    label={
                      id === 'sauge' || isPro ? Essences[id].name : `${Essences[id].name} · Pro`
                    }
                    color={Essences[id][scheme === 'dark' ? 'dark' : 'light']}
                    selected={(settings.essence ?? 'sauge') === id}
                    onPress={() =>
                      id === 'sauge' || isPro ? updateSettings({ essence: id }) : askPro()
                    }
                  />
                ))}
              </View>
            </View>
          </Group>

          <SectionTitle>Séances</SectionTitle>
          <Group>
            <Stepper
              label="Objectif quotidien"
              value={formatDuration(settings.dailyGoalMin)}
              onMinus={() =>
                updateSettings({ dailyGoalMin: Math.max(15, settings.dailyGoalMin - 15) })
              }
              onPlus={() =>
                updateSettings({ dailyGoalMin: Math.min(720, settings.dailyGoalMin + 15) })
              }
            />
            <Stepper
              label="Durée d’une séance"
              value={formatDuration(settings.focusMin)}
              onMinus={() => updateSettings({ focusMin: Math.max(5, settings.focusMin - 5) })}
              onPlus={() => {
                const next = Math.min(MAX_FOCUS, settings.focusMin + 5);
                if (next > FREE_MAX_FOCUS && !isPro) askPro();
                else updateSettings({ focusMin: next });
              }}
            />
            <ToggleRow
              label="Proposer une pause"
              detail="À la fin de chaque séance."
              value={settings.breaks}
              onChange={(breaks) => updateSettings({ breaks })}
            />
            {settings.breaks && (
              <View style={styles.block}>
                <ThemedText style={styles.label}>Durée de la pause</ThemedText>
                <Segmented
                  options={BREAKS}
                  value={settings.breakMin}
                  onChange={(breakMin) => updateSettings({ breakMin })}
                />
              </View>
            )}
          </Group>

          <SectionTitle>Pendant la séance</SectionTitle>
          <Group>
            <ToggleRow
              label="Phrases d’encouragement"
              value={settings.quotes}
              onChange={(quotes) => updateSettings({ quotes })}
            />
            <ToggleRow
              label="Garder l’écran allumé"
              detail="L’iPhone ne se met pas en veille."
              value={settings.keepAwake}
              onChange={(keepAwake) => updateSettings({ keepAwake })}
            />
            <ToggleRow
              label="Notification de fin"
              detail="Quand une séance ou une pause se termine."
              value={settings.notifications}
              onChange={(notifications) => updateSettings({ notifications })}
            />
            <ToggleRow
              label="Vibrations"
              detail="Au début et à la fin d’une séance."
              value={settings.haptics}
              onChange={(haptics) => updateSettings({ haptics })}
            />
          </Group>

          {channel !== 'free' && (
            <>
              <SectionTitle>Bûcheur Pro</SectionTitle>
              <Group>
                <Row
                  label="Bûcheur Pro"
                  detail={
                    isPro
                      ? licenseKey
                        ? `Clé ${maskKey(licenseKey)} · merci pour ton soutien`
                        : 'Merci pour ton soutien'
                      : 'Achat unique, pas d’abonnement'
                  }
                  value={isPro ? 'Activé' : `${price} ›`}
                  valueColor={theme.accent}
                  onPress={askPro}
                />
              </Group>
            </>
          )}

          <SectionTitle>Données</SectionTitle>
          <Group>
            <Button
              label={confirmReset ? 'Confirmer : tout effacer' : 'Effacer toutes les données'}
              variant="danger"
              onPress={() => {
                if (!confirmReset) return setConfirmReset(true);
                resetAll();
                close();
              }}
            />
          </Group>
          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            Bûcheur 1.0 · Tes révisions restent sur ton téléphone.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 30,
    lineHeight: 38,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  block: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    gap: 10,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 400,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
