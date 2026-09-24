import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip } from '@/components/ui';
import { colors, spacing, typography } from '@/components/theme';
import { runDetached, toErrorMessage } from '@/core/errors';
import { addDays, formatFriendlyDate, getLocalDeviceDate } from '@/core/localDate';
import type { PauseReason } from '@/domain/models';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';

const REASONS: { id: PauseReason; label: string }[] = [
  { id: 'vacation', label: '🏖 Vacation' },
  { id: 'sick', label: '🤒 Sick' },
  { id: 'other', label: '⏸ Other' },
];

const LENGTHS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

/** Planned breaks: streaks are paused (not broken) and no freezes are spent. */
export function PauseSetting() {
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
      (error) => setNote(`Couldn't save the pause. ${toErrorMessage(error)}`),
    );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="airplane-outline" size={20} color={colors.freeze} />
        <View style={{ flex: 1 }}>
          <Text style={typography.label}>Vacation & sick days</Text>
          <Text style={typography.caption}>Pause streaks for a while — they won’t break and no freezes are used.</Text>
        </View>
      </View>

      {current.map((p) => (
        <View key={p.id} style={styles.pauseRow}>
          <Text style={[typography.body, { flex: 1 }]}>
            {REASONS.find((r) => r.id === p.reason)?.label} · {formatFriendlyDate(p.startDate)} → {formatFriendlyDate(p.endDate)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End this pause"
            onPress={() => runDetached(removePause(p.id).then(reloadStreaks))}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <View style={styles.chips}>
        <Chip label="From today" selected={!startTomorrow} onPress={() => setStartTomorrow(false)} />
        <Chip label="From tomorrow" selected={startTomorrow} onPress={() => setStartTomorrow(true)} />
      </View>
      <View style={styles.chips}>
        {LENGTHS.map((l) => (
          <Chip key={l.days} label={l.label} selected={days === l.days} onPress={() => setDays(l.days)} />
        ))}
      </View>
      <Button label="Pause streaks" variant="secondary" onPress={create} />
      {note ? <Text style={[typography.caption, { color: colors.danger }]}>{note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pauseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
