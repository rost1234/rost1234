import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TextInput } from '@/components/Text';
import { EmptyState, IconButton, StatTile } from '@/components/ui';
import { useT } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { haptics } from '@/lib/haptics';
import { cardGroups, cardStats, deleteCards } from '@/local/logic';
import { useDBStore } from '@/local/store';
import type { Flashcard } from '@/local/types';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type Row =
  | { kind: 'subject'; id: string; title: string; total: number; due: number; open: boolean; ids: string[] }
  | { kind: 'concept'; id: string; title: string; total: number; due: number; open: boolean; ids: string[] }
  | { kind: 'card'; card: Flashcard; where?: string };

/** Search results are capped so a big store stays fast. */
const MAX_RESULTS = 100;

/**
 * The card store: how many cards there are (total, due, new, learned), and what they are,
 * by subject and concept. Open a subject, then a concept, to see its cards; tap a card to
 * edit it; the bin deletes all the cards of a subject or concept at once.
 */
export default function CardStoreScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const db = useDBStore((s) => s.db);
  // Recomputed when the cards change; "due" is as of when the screen opened or the data last changed.
  const stats = useMemo(() => cardStats(db, new Date()), [db]);
  const groups = useMemo(() => cardGroups(db, new Date()), [db]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  const q = query.trim().toLocaleLowerCase();
  const rows: Row[] = useMemo(() => {
    if (q) {
      const out: Row[] = [];
      for (const g of groups)
        for (const c of g.concepts)
          for (const card of c.cards)
            if (`${card.question} ${card.answer}`.toLocaleLowerCase().includes(q)) out.push({ kind: 'card', card, where: `${g.subject.title} · ${c.concept.title}` });
      return out.slice(0, MAX_RESULTS);
    }
    const out: Row[] = [];
    for (const g of groups) {
      const isOpen = !!open[g.subject.id];
      out.push({ kind: 'subject', id: g.subject.id, title: g.subject.title, total: g.total, due: g.due, open: isOpen, ids: g.concepts.flatMap((c) => c.cards.map((x) => x.id)) });
      if (!isOpen) continue;
      for (const c of g.concepts) {
        const cOpen = !!open[c.concept.id];
        out.push({ kind: 'concept', id: c.concept.id, title: c.concept.title, total: c.cards.length, due: c.due, open: cOpen, ids: c.cards.map((x) => x.id) });
        if (cOpen) for (const card of c.cards) out.push({ kind: 'card', card });
      }
    }
    return out;
  }, [groups, open, q]);

  const confirmDelete = async (title: string, ids: string[]) => {
    const ok = await confirmAsync({
      title: t('cards.deleteTitle', { n: ids.length }),
      message: t('cards.deleteBody', { title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) {
      haptics.success();
      useDBStore.getState().update((d) => deleteCards(d, ids));
    }
  };

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <View style={styles.tiles}>
        <StatTile label={t('cards.total')} value={stats.total} icon="albums-outline" />
        <StatTile label={t('cards.due')} value={stats.due} icon="time-outline" />
      </View>
      <View style={styles.tiles}>
        <StatTile label={t('cards.fresh')} value={stats.fresh} icon="sparkles-outline" />
        <StatTile label={t('cards.learned')} value={stats.learned} icon="checkmark-done-outline" />
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('cards.search')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('cards.search')}
          style={[styles.input, { textAlign: t.isRTL ? 'right' : 'left' }]}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('learn.clearSearch')} hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {q && rows.length === MAX_RESULTS ? <Text style={typography.caption}>{t('cards.capped', { n: MAX_RESULTS })}</Text> : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('cards.title') }} />
      {stats.total === 0 ? (
        <EmptyState icon="albums-outline" title={t('cards.emptyTitle')} body={t('cards.emptyBody')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => (r.kind === 'card' ? r.card.id : `${r.kind}-${r.id}`)}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={[typography.body, { textAlign: 'center' }]}>{t('cards.noMatch')}</Text>}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.kind === 'card' ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(`/card/${item.card.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
                {item.where ? <Text style={typography.caption}>{item.where}</Text> : null}
                <Text style={[typography.body, styles.start, { fontWeight: '700' }]} numberOfLines={2}>
                  {item.card.question}
                </Text>
                <Text style={[typography.caption, styles.start]} numberOfLines={2}>
                  {item.card.answer}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.group, item.kind === 'concept' && styles.concept]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: item.open }}
                  accessibilityLabel={`${item.title}, ${t('cards.count', { n: item.total })}`}
                  onPress={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
                  style={styles.groupMain}
                >
                  <Ionicons name={item.open ? 'chevron-down' : t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[item.kind === 'subject' ? typography.subheading : typography.body, styles.start]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[typography.caption, styles.start]}>{item.due ? t('cards.countDue', { n: item.total, due: item.due }) : t('cards.count', { n: item.total })}</Text>
                  </View>
                </Pressable>
                <IconButton icon="trash-outline" label={t('common.delete')} color={colors.danger} onPress={() => void confirmDelete(item.title, item.ids)} />
              </View>
            )
          }
        />
      )}
    </>
  );
}

const useStyles = makeStyles(({ colors, sheet }) => ({
  // Text at the start edge even when it begins with English letters.
  start: { textAlign: 'left', writingDirection: 'auto' },
  list: { padding: spacing.lg, paddingBottom: 96, gap: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...sheet, paddingHorizontal: spacing.md, minHeight: 48 },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.sm },
  group: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, ...sheet, paddingHorizontal: spacing.md, minHeight: 56 },
  groupMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  concept: { marginStart: spacing.lg, borderRadius: radius.md },
  card: { ...sheet, marginStart: spacing.xl, padding: spacing.md, gap: 2, borderRadius: radius.md },
}));
