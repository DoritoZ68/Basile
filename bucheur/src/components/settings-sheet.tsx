import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { IMPORT_SUPPORTED, pickBackup, saveBackup } from '@/lib/backup';
import { maskKey } from '@/lib/license';
import { usePro } from '@/lib/pro';
import { playAmbience, playChime, SOUND_SUPPORTED, stopAmbience } from '@/lib/sound';
import { formatDuration } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Appearance, EssenceId, SoundId } from '@/lib/types';

/** Au-delà de cette durée, une séance fait partie de Bûcheur Pro. */
export const FREE_MAX_FOCUS = 60;
const MAX_FOCUS = 120;

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];
const BREAKS = [5, 10, 15, 20].map((m) => ({ value: m, label: `${m} min` }));
const LONG_EVERY = [
  { value: 0, label: 'Jamais' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];
const LONG_BREAKS = [15, 20, 30].map((m) => ({ value: m, label: `${m} min` }));
const SOUNDS: { value: SoundId; label: string }[] = [
  { value: 'none', label: 'Silence' },
  { value: 'pluie', label: 'Pluie' },
  { value: 'brun', label: 'Bruit brun' },
  { value: 'blanc', label: 'Bruit blanc' },
];
const WEB = Platform.OS === 'web';

/**
 * Bouton de réglages à droite du titre d'un écran, sur iPhone seulement : sur le web, il est
 * déjà dans la barre de navigation du site.
 */
export function ScreenSettingsButton() {
  return Platform.OS === 'web' ? null : <SettingsButton />;
}

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
  const { settings, updateSettings, resetAll, exportData, importData } = useStore();
  const [name, setName] = useState(settings.name);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const { isPro, price, channel, licenseKey, openPaywall } = usePro();
  const [confirmReset, setConfirmReset] = useState(false);

  // Le paywall s'ouvre par-dessus : on ferme d'abord les réglages.
  const askPro = () => {
    onClose();
    openPaywall();
  };
  const close = () => {
    setConfirmReset(false);
    setBackupMessage(null);
    if (preview) {
      stopAmbience();
      setPreview(false);
    }
    onClose();
  };
  const onImport = async () => {
    const raw = await pickBackup();
    if (raw === null) return;
    const ok = await importData(raw);
    setBackupMessage(
      ok
        ? 'Sauvegarde restaurée.'
        : 'Ce fichier n’est pas une sauvegarde Bûcheur. Rien n’a été modifié.',
    );
  };
  const togglePreview = () => {
    if (preview) stopAmbience();
    else playAmbience(settings.sound === 'none' ? 'pluie' : settings.sound, settings.soundVolume);
    setPreview(!preview);
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
          <SectionTitle>Profil</SectionTitle>
          <Group>
            <View style={styles.block}>
              <ThemedText style={styles.label}>Ton prénom</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={() => updateSettings({ name: name.trim() })}
                onEndEditing={() => updateSettings({ name: name.trim() })}
                onSubmitEditing={() => updateSettings({ name: name.trim() })}
                placeholder="Pour un accueil personnalisé (facultatif)"
                placeholderTextColor={theme.textSecondary}
                maxLength={24}
                returnKeyType="done"
                accessibilityLabel="Ton prénom"
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
                ]}
              />
            </View>
          </Group>

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
            {settings.breaks && (
              <View style={styles.block}>
                <ThemedText style={styles.label}>Pause longue toutes les … séances</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Le cycle Pomodoro classique : une pause plus longue toutes les 4 séances.
                </ThemedText>
                <Segmented
                  options={LONG_EVERY}
                  value={settings.longBreakEvery}
                  onChange={(longBreakEvery) => updateSettings({ longBreakEvery })}
                />
                {settings.longBreakEvery > 0 && (
                  <Segmented
                    options={LONG_BREAKS}
                    value={settings.longBreakMin}
                    onChange={(longBreakMin) => updateSettings({ longBreakMin })}
                  />
                )}
              </View>
            )}
          </Group>

          {SOUND_SUPPORTED && (
            <>
              <SectionTitle>Ambiance sonore</SectionTitle>
              <Group>
                <View style={styles.block}>
                  <ThemedText style={styles.label}>Pendant les séances</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Un fond sonore régulier masque les bruits autour de toi. Il s’arrête pendant les
                    pauses.
                  </ThemedText>
                  <Segmented
                    options={SOUNDS}
                    value={settings.sound}
                    onChange={(sound) => {
                      updateSettings({ sound });
                      if (preview) {
                        if (sound === 'none') {
                          stopAmbience();
                          setPreview(false);
                        } else playAmbience(sound, settings.soundVolume);
                      }
                    }}
                  />
                </View>
                {settings.sound !== 'none' && (
                  <Stepper
                    label="Volume"
                    value={`${Math.round(settings.soundVolume * 100)} %`}
                    onMinus={() => {
                      const soundVolume = Math.max(
                        0.1,
                        Math.round(settings.soundVolume * 10 - 1) / 10,
                      );
                      updateSettings({ soundVolume });
                      if (preview) playAmbience(settings.sound, soundVolume);
                    }}
                    onPlus={() => {
                      const soundVolume = Math.min(
                        1,
                        Math.round(settings.soundVolume * 10 + 1) / 10,
                      );
                      updateSettings({ soundVolume });
                      if (preview) playAmbience(settings.sound, soundVolume);
                    }}
                  />
                )}
                <Row
                  label={preview ? 'Arrêter l’écoute' : 'Écouter un extrait'}
                  value={preview ? '■' : '▶'}
                  valueColor={theme.accent}
                  onPress={togglePreview}
                />
                <ToggleRow
                  label="Carillon de fin"
                  detail="Deux notes douces quand une séance ou une pause se termine."
                  value={settings.chime}
                  onChange={(chime) => {
                    updateSettings({ chime });
                    if (chime) playChime();
                  }}
                />
              </Group>
            </>
          )}

          <SectionTitle>Pendant la séance</SectionTitle>
          <Group>
            <ToggleRow
              label="Phrases d’encouragement"
              value={settings.quotes}
              onChange={(quotes) => updateSettings({ quotes })}
            />
            {!WEB && (
              <ToggleRow
                label="Garder l’écran allumé"
                detail="L’iPhone ne se met pas en veille."
                value={settings.keepAwake}
                onChange={(keepAwake) => updateSettings({ keepAwake })}
              />
            )}
            {!WEB && (
              <ToggleRow
                label="Notification de fin"
                detail="Quand une séance ou une pause se termine."
                value={settings.notifications}
                onChange={(notifications) => updateSettings({ notifications })}
              />
            )}
            {!WEB && (
              <ToggleRow
                label="Vibrations"
                detail="Au début et à la fin d’une séance."
                value={settings.haptics}
                onChange={(haptics) => updateSettings({ haptics })}
              />
            )}
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
            <Row
              label="Exporter une sauvegarde"
              detail={
                WEB
                  ? 'Tes données vivent dans ce navigateur : garde une copie en lieu sûr.'
                  : 'Un fichier à garder dans Fichiers ou à t’envoyer.'
              }
              value="↓"
              valueColor={theme.accent}
              onPress={() => {
                saveBackup(exportData());
                setBackupMessage('Sauvegarde exportée.');
              }}
            />
            {IMPORT_SUPPORTED && (
              <Row
                label="Restaurer une sauvegarde"
                detail="Remplace les données actuelles par celles du fichier."
                value="↑"
                valueColor={theme.accent}
                onPress={onImport}
              />
            )}
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
          {backupMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              {backupMessage}
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            Bûcheur 2.0 · Tes révisions restent sur {WEB ? 'cet appareil' : 'ton téléphone'}.
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
  input: {
    fontSize: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
