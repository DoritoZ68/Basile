import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui';
import type { Method } from '@/lib/methods';

/** Carte d'une méthode de révision, qui ouvre son article. */
export function MethodCard({ method }: { method: Method }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={method.title}
      onPress={() => router.navigate({ pathname: '/methodes/[id]', params: { id: method.id } })}
      style={({ pressed }) => [styles.cardPress, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Panel
        eyebrow={`${method.category} · ${method.readMin} min`}
        title={method.title}
        style={styles.card}>
        <ThemedText themeColor="textSecondary" style={styles.flex}>
          {method.summary}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="text">
          Lire la méthode ›
        </ThemedText>
      </Panel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPress: {
    flex: 1,
  },
  card: {
    flex: 1,
    minHeight: 190,
  },
  flex: {
    flex: 1,
  },
});
