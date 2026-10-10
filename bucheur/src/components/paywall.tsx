import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { ThemedText } from '@/components/themed-text';
import { TreeRings } from '@/components/tree-rings';
import { Button, Group, Row } from '@/components/ui';
import { Display, Spacing, SubjectColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FREE_LIMITS, usePro } from '@/lib/pro';

const PERKS = [
  { label: 'Matières illimitées', detail: `La version gratuite en compte ${FREE_LIMITS.subjects}` },
  { label: 'Examens illimités', detail: `La version gratuite en compte ${FREE_LIMITS.exams}` },
  { label: 'Séances jusqu’à 2 heures', detail: 'Pour les longues sessions avant le jour J' },
  { label: 'Tout ton historique', detail: 'Remonte tes semaines passées en rondelles' },
  { label: 'Essences de bois', detail: 'Chêne, érable, bois de nuit : choisis ta couleur' },
];

const SAMPLE_RINGS = [
  { key: 'a', color: SubjectColors[2], minutes: 25 },
  { key: 'b', color: SubjectColors[0], minutes: 45 },
  { key: 'c', color: SubjectColors[1], minutes: 25 },
  { key: 'd', color: SubjectColors[3], minutes: 15 },
];

export function Paywall() {
  const theme = useTheme();
  const {
    isPro,
    channel,
    price,
    available,
    purchase,
    restore,
    activateLicense,
    paywallOpen,
    closePaywall,
  } = usePro();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const license = channel === 'license';

  const close = () => {
    setMessage(null);
    closePaywall();
  };

  const onPurchase = async () => {
    setBusy(true);
    setMessage(null);
    const result = await purchase();
    setBusy(false);
    if (result === 'error') setMessage('L’achat n’a pas pu aboutir. Réessaie dans un instant.');
  };

  const onActivate = async () => {
    setBusy(true);
    setMessage(null);
    const result = await activateLicense(key);
    setBusy(false);
    setMessage(result.message);
    if (result.ok) setKey('');
  };

  const onRestore = async () => {
    setBusy(true);
    setMessage(null);
    const found = await restore();
    setBusy(false);
    setMessage(
      found
        ? 'Achat retrouvé : Bûcheur Pro est activé.'
        : 'Aucun achat Bûcheur Pro trouvé sur ce compte.',
    );
  };

  return (
    <Modal
      visible={paywallOpen}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <Ambient />
        <View style={styles.topBar}>
          <Button label={isPro ? 'Fermer' : 'Plus tard'} variant="glass" onPress={close} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <TreeRings size={140} sessions={SAMPLE_RINGS} goalMinutes={130} />
            <ThemedText style={styles.title}>Bûcheur Pro</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.tagline}>
              {isPro ? 'Merci de soutenir Bûcheur.' : 'Un seul achat, pour toujours.'}
            </ThemedText>
          </View>

          <Group>
            {PERKS.map((p) => (
              <Row
                key={p.label}
                label={p.label}
                detail={p.detail}
                value="✓"
                valueColor={theme.accent}
              />
            ))}
          </Group>

          {isPro ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Toutes les fonctions Pro sont débloquées. Tu peux choisir ton essence de bois dans les
              réglages.
            </ThemedText>
          ) : (
            <View style={styles.actions}>
              <Button
                label={
                  busy && !license
                    ? 'Un instant…'
                    : license
                      ? `Acheter pour ${price}`
                      : `Débloquer pour ${price}`
                }
                disabled={busy || !available}
                onPress={onPurchase}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {channel === 'simulated'
                  ? 'Aperçu : l’achat est simulé, aucun paiement n’est effectué.'
                  : license
                    ? 'Paiement unique et sécurisé sur Gumroad. Tu reçois ta clé de licence par e-mail.'
                    : available
                      ? 'Paiement unique avec ton identifiant Apple. Pas d’abonnement.'
                      : 'La boutique n’est pas disponible pour le moment.'}
              </ThemedText>
              {license ? (
                <View style={styles.licenseBox}>
                  <ThemedText type="smallBold" style={styles.center}>
                    Tu as déjà ta clé ?
                  </ThemedText>
                  <Group>
                    <TextInput
                      value={key}
                      onChangeText={setKey}
                      onSubmitEditing={onActivate}
                      placeholder="Colle ta clé de licence"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                      accessibilityLabel="Clé de licence"
                      style={[styles.keyInput, { color: theme.text }]}
                    />
                  </Group>
                  <Button
                    label={busy ? 'Vérification…' : 'Activer Bûcheur Pro'}
                    variant="glass"
                    disabled={busy || !key.trim()}
                    onPress={onActivate}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                    La même clé fonctionne sur ton téléphone et ton ordinateur.
                  </ThemedText>
                </View>
              ) : (
                <Button
                  label="Restaurer mes achats"
                  variant="plain"
                  disabled={busy}
                  onPress={onRestore}
                />
              )}
            </View>
          )}

          {message && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {message}
            </ThemedText>
          )}
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.two,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 34,
    lineHeight: 42,
    marginTop: Spacing.two,
  },
  tagline: {
    fontFamily: Display.italic,
    fontWeight: 'normal',
    fontSize: 18,
    lineHeight: 26,
  },
  actions: {
    gap: Spacing.two,
  },
  licenseBox: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  keyInput: {
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    letterSpacing: 0.5,
  },
  center: {
    textAlign: 'center',
  },
});
