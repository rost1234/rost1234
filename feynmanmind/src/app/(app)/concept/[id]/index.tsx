import { useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScoreRing } from '@/components/ScoreRing';
import { Button, Card, Chevron, ErrorState, IconButton, type IconName, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useConcept } from '@/data/concepts';
import { useDeleteFlashcard, useFlashcards, type CardRow } from '@/data/flashcards';
import { useSessions } from '@/data/sessions';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatDateTime } from '@/lib/format';
import { makeStyles, radius, scoreColor, spacing, useTheme } from '@/theme';

export default function ConceptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const concept = useConcept(id);
  const sessions = useSessions(id);
  const cards = useFlashcards(id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const dueCount = cards.data?.filter((c) => c.next_review_date && Date.parse(c.next_review_date) <= now).length ?? 0;

  const refresh = () => {
    void concept.refetch();
    void sessions.refetch();
    void cards.refetch();
  };

  if (concept.isPending) return <LoadingState />;
  if (concept.isError) return <ErrorState message={errorMessage(concept.error, t)} onRetry={refresh} />;

  return (
    <>
      <Stack.Screen options={{ title: concept.data.title }} />
      <Screen refreshControl={<RefreshControl refreshing={concept.isRefetching} onRefresh={refresh} tintColor={colors.primary} />}>
        <Card style={styles.header}>
          <ScoreRing score={concept.data.mastery_level} caption={t('concept.mastery')} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={typography.caption}>{concept.data.subject.title}</Text>
            <Text style={typography.heading}>{concept.data.title}</Text>
            <Text style={typography.caption}>{t('concept.masteryHint')}</Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <ActionTile icon="chatbubbles" title={t('concept.explain')} hint={t('concept.explainHint')} onPress={() => router.push(`/concept/${id}/explain`)} />
          <ActionTile icon="sparkles" title={t('concept.generate')} hint={t('concept.generateHint')} onPress={() => router.push(`/concept/${id}/generate`)} />
        </View>
        {dueCount > 0 ? (
          <Button label={t.plural('concept.review', dueCount)} icon="play" onPress={() => router.push({ pathname: '/study', params: { conceptId: id } })} />
        ) : null}

        <SectionHeader title={t('concept.sessions')} />
        {sessions.isPending ? (
          <LoadingState />
        ) : sessions.isError ? (
          <ErrorState message={errorMessage(sessions.error, t)} onRetry={() => void sessions.refetch()} />
        ) : sessions.data.length === 0 ? (
          <Text style={typography.caption}>{t('concept.noSessions')}</Text>
        ) : (
          sessions.data.slice(0, 10).map((s) => (
            <Card key={s.id} onPress={() => router.push(`/session/${s.id}`)} accessibilityLabel={formatDateTime(s.created_at, t)}>
              <View style={styles.row}>
                <View style={[styles.scorePill, { backgroundColor: scoreColor(s.comprehension_score ?? 0, colors) }]}>
                  <Text style={styles.scoreText}>{s.comprehension_score ?? '–'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.body} numberOfLines={2}>
                    {s.user_explanation}
                  </Text>
                  <Text style={typography.caption}>{formatDateTime(s.created_at, t)}</Text>
                </View>
                <Chevron />
              </View>
            </Card>
          ))
        )}

        <SectionHeader
          title={t('concept.cards')}
          action={<Button label={t('concept.addCard')} icon="add" variant="ghost" onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', conceptId: id } })} />}
        />
        {cards.isPending ? (
          <LoadingState />
        ) : cards.isError ? (
          <ErrorState message={errorMessage(cards.error, t)} onRetry={() => void cards.refetch()} />
        ) : cards.data.length === 0 ? (
          <Text style={typography.caption}>{t('concept.noCards')}</Text>
        ) : (
          cards.data.map((c) => (
            <FlashcardRow key={c.id} card={c} now={now} expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
          ))
        )}
      </Screen>
    </>
  );
}

function ActionTile({ icon, title, hint, onPress }: { icon: IconName; title: string; hint: string; onPress: () => void }) {
  const styles = useStyles();
  const { colors, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={typography.subheading}>{title}</Text>
      <Text style={typography.caption}>{hint}</Text>
    </Pressable>
  );
}

function FlashcardRow({ card, now, expanded, onToggle }: { card: CardRow; now: number; expanded: boolean; onToggle: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const remove = useDeleteFlashcard();
  const due = card.next_review_date ? Date.parse(card.next_review_date) <= now : false;

  const confirmDelete = async () => {
    const ok = await confirmAsync({
      title: t('concept.deleteCard.title'),
      message: t('concept.deleteCard.body'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) remove.mutate(card.id);
  };

  return (
    <Card onPress={onToggle} accessibilityLabel={card.question}>
      <View style={styles.row}>
        <Text style={[typography.body, { flex: 1, fontWeight: '600' }]}>{card.question}</Text>
        {due ? <View style={styles.dueDot} accessibilityLabel={t('review.title')} /> : null}
      </View>
      {expanded ? (
        <>
          <Text style={[typography.body, { color: colors.textMuted }]}>{card.answer}</Text>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={typography.caption}>{card.next_review_date ? formatDate(card.next_review_date, t) : ''}</Text>
            <View style={styles.row}>
              <IconButton icon="create-outline" label={t('common.edit')} onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })} />
              <IconButton icon="trash-outline" label={t('common.delete')} color={colors.danger} onPress={() => void confirmDelete()} />
            </View>
          </View>
        </>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scorePill: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#FFFFFF', fontWeight: '800' },
  dueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
}));
