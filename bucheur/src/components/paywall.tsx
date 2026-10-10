import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TreeRings } from '@/components/tree-rings';
import { Button, Group, Row } from '@/components/ui';
import { Display, Spacing, SubjectColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FREE_LIMITS, PURCHASES_SIMULATED, usePro } from '@/lib/pro';

const PERKS = [
  { label: 'Matières illimitées', detail: `La version gratuite en compte ${FREE_LIMITS.subjects}` },
  { label: 'Examens illimités', detail: `La version gratuite en compte ${FREE_LIMITS.exams}` },
  { label: 'Séances de 90 minutes', detail: 'Pour les longues sessions avant le jour J' },
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
  const { isPro, price, available, purchase, restore, paywallOpen, closePaywall } = usePro();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.topBar}>
          <Button label={isPro ? 'Fermer' : 'Plus tard'} variant="plain" onPress={close} />
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
              Toutes les fonctions Pro sont débloquées. Tu peux choisir ton essence de bois dans
              Statistiques › Réglages.
            </ThemedText>
          ) : (
            <View style={styles.actions}>
              <Button
                label={busy ? 'Un instant…' : `Débloquer pour ${price}`}
                disabled={busy || !available}
                onPress={onPurchase}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {PURCHASES_SIMULATED
                  ? 'Aperçu : l’achat est simulé, aucun paiement n’est effectué.'
                  : available
                    ? 'Paiement unique avec ton identifiant Apple. Pas d’abonnement.'
                    : 'La boutique n’est pas disponible pour le moment.'}
              </ThemedText>
              <Button
                label="Restaurer mes achats"
                variant="plain"
                disabled={busy}
                onPress={onRestore}
              />
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
  center: {
    textAlign: 'center',
  },
});
