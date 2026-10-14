import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { insightLines, sourceShort } from '@/content/insights';
import type { InsightCategory } from '@/content/insightSchema';
import type { GrowthStage } from '@/domain/garden';
import { Sprout } from '@/features/garden/Sprout';
import { useT, type TranslationKey } from '@/i18n';
import { useNotebookStore, type TellReason } from '@/state/notebookStore';
import type { NotebookEntry } from './notebookEntries';

export const CATEGORY_LABEL: Record<InsightCategory, TranslationKey> = {
  habits: 'notebook.cat.habits',
  focus: 'notebook.cat.focus',
  sleep_energy: 'notebook.cat.sleep_energy',
  mood: 'notebook.cat.mood',
  social: 'notebook.cat.social',
  motivation: 'notebook.cat.motivation',
};

const REASON_LABEL: Record<TellReason, TranslationKey> = {
  daily: 'notebook.reason.daily',
  notToday: 'notebook.reason.notToday',
  lowMood: 'notebook.reason.lowMood',
  focusStopped: 'notebook.reason.focusStopped',
  newHabit: 'notebook.reason.newHabit',
  listened: 'notebook.reason.listened',
};

/**
 * One card in the notebook. In the Garden look it's a small speech bubble from the sprout, in its
 * own words; otherwise a plain card. Under it: where it's from, and on tap the suggestion and the
 * full source (the only place sources show).
 */
export function NoteEntry({ entry, garden, stage }: { entry: NotebookEntry; garden: boolean; stage: GrowthStage }) {
  const t = useT();
  const { colors, scenery, typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const { insight } = entry;
  const saved = useNotebookStore((s) => s.saved.includes(insight.id));
  const lines = insightLines(insight, t.language === 'he', garden);
  const caveat = t.language === 'he' ? insight.he.caveat : insight.caveat;
  const meta = entry.reason ? `${t(CATEGORY_LABEL[insight.category])} · ${t(REASON_LABEL[entry.reason])}` : t(CATEGORY_LABEL[insight.category]);

  return (
    <View style={styles.row}>
      {garden ? (
        <View style={styles.avatar}>
          <Sprout stage={stage} mood="happy" size={34} />
        </View>
      ) : null}
      <View style={[styles.bubble, { backgroundColor: colors.surface }, garden ? styles.bubbleGarden : styles.card]}>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.accent }]}>{meta}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? t('tip.savedA11y') : t('tip.save')}
            accessibilityState={{ selected: saved }}
            onPress={() => {
              haptics.select();
              useNotebookStore.getState().toggleSaved(insight.id);
            }}
            hitSlop={10}
            style={styles.star}
          >
            <Ionicons name={saved ? 'star' : 'star-outline'} size={18} color={saved ? scenery.sun : scenery.coral} />
          </Pressable>
        </View>
        <Text style={typography.body}>{lines.finding}</Text>
        {open ? (
          <View style={styles.more}>
            <Text style={typography.body}>{lines.action}</Text>
            <View style={[styles.sourceBox, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={typography.label}>{t('notebook.source')}</Text>
              <Text style={typography.caption}>
                {insight.source.authors} ({insight.source.year}) · {insight.source.venue ?? insight.source.title}
                {insight.source.institution ? ` · ${insight.source.institution}` : ''}
              </Text>
              {caveat ? <Text style={typography.caption}>{t('insight.caveat', { caveat })}</Text> : null}
              <Text style={typography.caption}>{t(`insight.evidence.${insight.evidence}`)}</Text>
              <Pressable accessibilityRole="link" onPress={() => runDetached(Linking.openURL(insight.source.url))} hitSlop={8} style={styles.paper}>
                <Text style={[typography.label, { color: colors.primary }]}>{t('notebook.paper')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.7 }]}
        >
          <Text style={typography.caption}>{open ? t('notebook.less') : `${sourceShort(insight)} · ${t('notebook.more')}`}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ flat }) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, alignItems: 'center', marginTop: 2 },
  bubble: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  bubbleGarden: { borderRadius: 20, borderTopStartRadius: 6 },
  card: { borderRadius: radius.lg, ...flat },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meta: { flex: 1, fontSize: 12, fontWeight: '600' },
  star: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  more: { gap: spacing.sm, marginTop: spacing.xs },
  sourceBox: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md },
  paper: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 32 },
}));
