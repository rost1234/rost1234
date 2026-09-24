import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { addDays, formatFriendlyDate, getLocalDeviceDate } from '@/core/localDate';
import type { PauseReason } from '@/domain/models';
import type { TranslationKey } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useT } from '@/i18n';

const REASONS: { id: PauseReason; label: TranslationKey }[] = [
  { id: 'vacation', label: 'pause.vacation' },
  { id: 'sick', label: 'pause.sick' },
  { id: 'other', label: 'pause.other' },
];

const LENGTHS: { days: number; label: TranslationKey | null }[] = [
  { days: 1, label: null },
  { days: 3, label: null },
  { days: 7, label: 'pause.week' },
  { days: 14, label: 'pause.weeks2' },
];

/** Planned breaks: streaks are paused (not broken) and no freezes are spent. */
export function PauseSetting() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const pauses = usePlanningStore((s) => s.pauses);
  const addPause = usePlanningStore((s) => s.addPause);
  const removePause = usePlanningStore((s) => s.removePause);
  const [reason, setReason] = useState<PauseReason>('vacation');
  const [days, setDays] = useState(7);
  const [startTomorrow, setStartTomorrow] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const today = getLocalDeviceDate();
  const current = pauses.filter((p) => p.endDate >= today);

  const reloadStreaks = () => runDetached(useHabitStore.getState().load(today));

  const create = () =>
    runDetached(
      addPause(startTomorrow ? addDays(today, 1) : today, days, reason).then(() => {
        setNote(null);
        reloadStreaks();
      }),
      (error) => setNote(t('pause.saveError', { error: toErrorMessage(error) })),
    );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="airplane-outline" size={20} color={colors.freeze} />
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>{t('pause.title')}</Text>
          <Text style={typography.caption}>{t('pause.lead')}</Text>
        </View>
      </View>

      {current.map((p) => (
        <View key={p.id} style={styles.pauseRow}>
          <Text style={[typography.body, { flex: 1 }]}>
            {t(REASONS.find((r) => r.id === p.reason)?.label ?? 'pause.other')} · {formatFriendlyDate(p.startDate, t.locale)} → {formatFriendlyDate(p.endDate, t.locale)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pause.endA11y')}
            onPress={() => runDetached(removePause(p.id).then(reloadStreaks))}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r.id} label={t(r.label)} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <View style={styles.chips}>
        <Chip label={t('pause.fromToday')} selected={!startTomorrow} onPress={() => setStartTomorrow(false)} />
        <Chip label={t('pause.fromTomorrow')} selected={startTomorrow} onPress={() => setStartTomorrow(true)} />
      </View>
      <View style={styles.chips}>
        {LENGTHS.map((l) => (
          <Chip key={l.days} label={l.label ? t(l.label) : t.plural('pause.days', l.days)} selected={days === l.days} onPress={() => setDays(l.days)} />
        ))}
      </View>
      <Button label={t('pause.button')} variant="secondary" onPress={create} />
      {note ? <Text style={[typography.caption, { color: colors.danger }]}>{note}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pauseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
