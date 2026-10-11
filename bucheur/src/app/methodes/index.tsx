import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { MethodCard } from '@/components/method-card';
import { ScreenSettingsButton } from '@/components/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { Chip, Grid, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { METHOD_CATEGORIES, METHODS, type MethodCategory } from '@/lib/methods';

export default function MethodsScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<MethodCategory | null>(null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = METHODS.filter(
    (x) =>
      (!category || x.category === category) &&
      (!q || `${x.title} ${x.summary} ${x.category}`.toLowerCase().includes(q)),
  );

  return (
    <Screen subtitle="Ressources" title="Méthodes de révision" action={<ScreenSettingsButton />}>
      <ThemedText themeColor="textSecondary" style={styles.lead}>
        {METHODS.length} fiches pratiques pour réviser mieux, pas plus : se concentrer, mémoriser,
        comprendre, s’organiser et arriver serein le jour J. Chacune se lit en deux minutes et
        s’applique directement dans Bûcheur.
      </ThemedText>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une méthode (mémoire, stress, sommeil…)"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Rechercher une méthode"
        style={[
          styles.search,
          { color: theme.text, backgroundColor: theme.glass, borderColor: theme.glassEdge },
        ]}
      />
      <View style={styles.chips}>
        <Chip label="Toutes" selected={category === null} onPress={() => setCategory(null)} />
        {METHOD_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </View>

      {shown.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Aucune méthode ne correspond à ta recherche.
        </ThemedText>
      ) : (
        <Grid min={300}>
          {shown.map((x) => (
            <MethodCard key={x.id} method={x} />
          ))}
        </Grid>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    maxWidth: 680,
  },
  search: {
    fontSize: 16,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
