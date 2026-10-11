import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ScreenSettingsButton } from '@/components/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import {
  Button,
  Chip,
  Grid,
  Group,
  Panel,
  ProgressBar,
  Row,
  Screen,
  SectionTitle,
  TextLink,
} from '@/components/ui';
import { Display, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { BOX_INTERVALS, daysBeforeReview, dueCards, masteredCount, MAX_BOX } from '@/lib/leitner';
import { FREE_LIMITS, usePro } from '@/lib/pro';
import { useStore } from '@/lib/store';
import type { Card } from '@/lib/types';

// Sur iPhone, pas de fondu : une opacité sur le parent ferait disparaître le Liquid Glass.

/** Une session de révision : la liste des fiches à passer, figée au lancement. */
type Review = { ids: string[]; index: number; known: number; revealed: boolean };

export default function CardsScreen() {
  const { data } = useStore();
  const now = useNow(60_000);
  const [review, setReview] = useState<Review | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const cards = data.cards.filter((c) => !filter || c.subjectId === filter);
  const due = dueCards(cards, now);

  if (review) return <ReviewSession review={review} onChange={setReview} />;

  return (
    <Screen subtitle="Mémoriser durablement" title="Fiches" action={<ScreenSettingsButton />}>
      <ThemedText themeColor="textSecondary" style={styles.lead}>
        Une question au recto, la réponse au verso. Bûcheur te les repropose au bon moment : une
        fiche bien sue revient de plus en plus tard, une fiche ratée revient dès demain.
      </ThemedText>

      {data.subjects.length > 0 && data.cards.length > 0 && (
        <View style={styles.chips}>
          <Chip label="Toutes" selected={filter === null} onPress={() => setFilter(null)} />
          {data.subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              color={s.color}
              selected={filter === s.id}
              onPress={() => setFilter(filter === s.id ? null : s.id)}
            />
          ))}
        </View>
      )}

      <Grid min={340}>
        <View style={styles.column}>
          <TodayPanel
            cards={cards}
            due={due}
            onStart={() =>
              setReview({ ids: due.map((c) => c.id), index: 0, known: 0, revealed: false })
            }
          />
          <AddCardPanel defaultSubject={filter ?? undefined} />
        </View>
        <View style={styles.column}>
          <CardList cards={cards} now={now} />
        </View>
      </Grid>
    </Screen>
  );
}

function TodayPanel({ cards, due, onStart }: { cards: Card[]; due: Card[]; onStart: () => void }) {
  const theme = useTheme();
  const mastered = masteredCount(cards);
  const boxes = Array.from(
    { length: MAX_BOX },
    (_, i) => cards.filter((c) => c.box === i + 1).length,
  );
  const biggest = Math.max(1, ...boxes);

  return (
    <Panel
      eyebrow="Aujourd’hui"
      title={
        due.length === 0
          ? 'Rien à revoir'
          : `${due.length} fiche${due.length > 1 ? 's' : ''} à revoir`
      }>
      {cards.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Crée ta première fiche juste en dessous. Elle te sera proposée dès aujourd’hui.
        </ThemedText>
      ) : (
        <>
          <View style={styles.boxes}>
            {boxes.map((n, i) => (
              <View key={i} style={styles.box}>
                <View style={styles.boxBarTrack}>
                  <View
                    style={[
                      styles.boxBar,
                      {
                        height: `${Math.max(4, (n / biggest) * 100)}%`,
                        backgroundColor: theme.accent,
                        opacity: 0.35 + (i / (MAX_BOX - 1)) * 0.65,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="smallBold">{n}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {`Boîte ${i + 1}`}
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {cards.length} fiche{cards.length > 1 ? 's' : ''} · {mastered} acquise
            {mastered > 1 ? 's' : ''} (boîte {MAX_BOX}). Intervalles :{' '}
            {BOX_INTERVALS.map((d) => `${d} j`).join(', ')}.
          </ThemedText>
          {due.length > 0 ? (
            <Button
              label={`Réviser ${due.length} fiche${due.length > 1 ? 's' : ''}`}
              onPress={onStart}
            />
          ) : (
            <ThemedText themeColor="textSecondary">
              Tout est à jour. Reviens demain, ou ajoute de nouvelles fiches.
            </ThemedText>
          )}
        </>
      )}
      <TextLink
        label="Pourquoi ça marche ›"
        onPress={() =>
          router.navigate({ pathname: '/methodes/[id]', params: { id: 'repetition-espacee' } })
        }
      />
    </Panel>
  );
}

function AddCardPanel({ defaultSubject }: { defaultSubject?: string }) {
  const theme = useTheme();
  const { data, addCard } = useStore();
  const { isPro, openPaywall } = usePro();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>(defaultSubject);
  const [added, setAdded] = useState(0);
  const locked = !isPro && data.cards.length >= FREE_LIMITS.cards;
  const valid = front.trim().length > 0 && back.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    if (locked) return openPaywall();
    addCard({ front: front.trim(), back: back.trim(), subjectId });
    setFront('');
    setBack('');
    setAdded((n) => n + 1);
  };

  return (
    <Panel title="Nouvelle fiche">
      {locked ? (
        <Row
          label={`Plus de ${FREE_LIMITS.cards} fiches`}
          detail="Fiches illimitées avec Bûcheur Pro"
          value="Pro ›"
          valueColor={theme.accent}
          onPress={openPaywall}
        />
      ) : (
        <>
          <TextInput
            value={front}
            onChangeText={setFront}
            placeholder="Recto : la question (ex. Date de la chute du mur de Berlin ?)"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={240}
            accessibilityLabel="Recto de la fiche"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
          />
          <TextInput
            value={back}
            onChangeText={setBack}
            placeholder="Verso : la réponse (ex. 9 novembre 1989)"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={400}
            accessibilityLabel="Verso de la fiche"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
          />
          {data.subjects.length > 0 && (
            <View style={styles.chips}>
              {data.subjects.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  color={s.color}
                  selected={subjectId === s.id}
                  onPress={() => setSubjectId(subjectId === s.id ? undefined : s.id)}
                />
              ))}
            </View>
          )}
          <Button label="Ajouter la fiche" onPress={submit} disabled={!valid} />
          {added > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {added} fiche{added > 1 ? 's' : ''} ajoutée{added > 1 ? 's' : ''}. Tu peux enchaîner.
            </ThemedText>
          )}
        </>
      )}
    </Panel>
  );
}

function CardList({ cards, now }: { cards: Card[]; now: number }) {
  const theme = useTheme();
  const { data, removeCard } = useStore();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  if (cards.length === 0) return null;

  const q = query.trim().toLowerCase();
  const shown = cards
    .filter((c) => !q || `${c.front} ${c.back}`.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={styles.column}>
      <SectionTitle>{`Toutes les fiches · ${cards.length}`}</SectionTitle>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une fiche"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Rechercher une fiche"
        style={[
          styles.search,
          { color: theme.text, backgroundColor: theme.glass, borderColor: theme.glassEdge },
        ]}
      />
      {shown.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Aucune fiche ne correspond à « {query.trim()} ».
        </ThemedText>
      ) : (
        <Group>
          {shown.slice(0, 60).map((c) => {
            const subject = data.subjects.find((s) => s.id === c.subjectId);
            const days = daysBeforeReview(c, now);
            const open = openId === c.id;
            return (
              <View key={c.id}>
                <Row
                  label={c.front}
                  color={subject?.color}
                  detail={`Boîte ${c.box} · ${days === 0 ? 'à revoir aujourd’hui' : `dans ${days} j`}`}
                  value={open ? '−' : '+'}
                  onPress={() => setOpenId(open ? null : c.id)}
                />
                {open && (
                  <View style={styles.cardDetail}>
                    <ThemedText themeColor="textSecondary">{c.back}</ThemedText>
                    {(c.reviews ?? 0) > 0 && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {c.correct ?? 0} bonne{(c.correct ?? 0) > 1 ? 's' : ''} réponse
                        {(c.correct ?? 0) > 1 ? 's' : ''} sur {c.reviews}.
                      </ThemedText>
                    )}
                    <Button
                      label="Supprimer la fiche"
                      variant="danger"
                      onPress={() => removeCard(c.id)}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </Group>
      )}
    </View>
  );
}

function ReviewSession({
  review,
  onChange,
}: {
  review: Review;
  onChange: (review: Review | null) => void;
}) {
  const theme = useTheme();
  const { data, answerCard } = useStore();
  const total = review.ids.length;
  const finished = review.index >= total;
  const card = finished ? null : data.cards.find((c) => c.id === review.ids[review.index]);
  const subject = data.subjects.find((s) => s.id === card?.subjectId);

  const answer = (correct: boolean) => {
    if (!card) return;
    answerCard(card.id, correct);
    onChange({
      ...review,
      index: review.index + 1,
      known: review.known + (correct ? 1 : 0),
      revealed: false,
    });
  };

  return (
    <Screen
      subtitle="Révision des fiches"
      title={finished ? 'Session terminée' : `${review.index + 1} / ${total}`}>
      <View style={styles.reviewWrap}>
        <ProgressBar value={review.index / total} />
        {finished || !card ? (
          <Panel>
            <ThemedText style={styles.cardText}>
              {review.known === total ? 'Sans faute. Impressionnant.' : 'Bien travaillé.'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {review.known} sur {total} fiche{total > 1 ? 's' : ''} sue
              {review.known > 1 ? 's' : ''}.
              {review.known < total
                ? ' Les fiches ratées reviendront demain : c’est normal, c’est comme ça qu’on retient.'
                : ' Elles reviendront plus tard pour ancrer le souvenir.'}
            </ThemedText>
            <Button label="Retour aux fiches" onPress={() => onChange(null)} />
          </Panel>
        ) : (
          <Animated.View
            key={`${card.id}-${review.revealed}`}
            entering={Platform.OS === 'web' ? FadeIn.duration(220) : undefined}>
            <Panel eyebrow={subject ? subject.name : `Boîte ${card.box}`}>
              <ThemedText style={styles.cardText}>{card.front}</ThemedText>
              {review.revealed ? (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <ThemedText style={styles.answer}>{card.back}</ThemedText>
                  <View style={styles.answerButtons}>
                    <Button
                      label="À revoir"
                      variant="glass"
                      color={theme.danger}
                      onPress={() => answer(false)}
                      style={styles.flex}
                    />
                    <Button label="Je savais" onPress={() => answer(true)} style={styles.flex} />
                  </View>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onChange({ ...review, revealed: true })}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <View style={[styles.reveal, { borderColor: theme.border }]}>
                    <ThemedText themeColor="textSecondary">
                      Cherche la réponse dans ta tête, puis touche ici pour la voir.
                    </ThemedText>
                  </View>
                </Pressable>
              )}
            </Panel>
          </Animated.View>
        )}
        {!finished && (
          <Button label="Arrêter la révision" variant="plain" onPress={() => onChange(null)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    maxWidth: 640,
  },
  column: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  boxes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  box: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  boxBarTrack: {
    height: 64,
    width: '100%',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  boxBar: {
    width: '100%',
    borderRadius: 6,
  },
  input: {
    fontSize: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  search: {
    fontSize: 16,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  hint: {
    marginLeft: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  cardDetail: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  reviewWrap: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  cardText: {
    fontFamily: Display.title,
    fontWeight: 'normal',
    fontSize: 26,
    lineHeight: 34,
  },
  divider: {
    height: 1,
  },
  answer: {
    fontSize: 19,
    lineHeight: 28,
  },
  answerButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  reveal: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: Spacing.four,
    alignItems: 'center',
  },
});
