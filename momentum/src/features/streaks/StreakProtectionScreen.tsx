import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { showConfirm } from '@/components/Overlay';
import { SheetHeader } from '@/components/SheetHeader';
import { Banner, Button, Card, Chip, ProgressBar, SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { runDetached, toErrorMessage } from '@/core/errors';
import { addDays, formatFriendlyDate, formatShortDate, type LocalDateString } from '@/core/localDate';
import { repositories } from '@/data/repositories';
import { freezeHistory, MAX_STREAK_FREEZES, perfectDaysTowardNextFreeze, PERFECT_WEEK_DAYS, type FreezeUse } from '@/domain/freezeRewards';
import type { Pause, PauseReason } from '@/domain/models';
import { applyPausesToAll, pauseLength } from '@/domain/pauses';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useT, type TranslationKey } from '@/i18n';
import { statusesByHabit } from '@/services/streakService';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useSettingsStore } from '@/state/settingsStore';

const REASONS: { id: PauseReason; label: TranslationKey }[] = [
  { id: 'vacation', label: 'pause.vacation' },
  { id: 'sick', label: 'pause.sick' },
  { id: 'other', label: 'pause.other' },
];

const reasonLabel = (reason: PauseReason): TranslationKey => REASONS.find((r) => r.id === reason)?.label ?? 'pause.other';

/** How far back freeze history is shown. */
const HISTORY_DAYS = 120;
const HISTORY_ROWS = 5;
/** A pause longer than this is almost certainly a mistake in the steppers. */
const MAX_PAUSE_DAYS = 60;

interface FreezeData {
  uses: FreezeUse[];
  titles: Map<string, string>;
  progress: number;
}

async function loadFreezeData(today: LocalDateString): Promise<FreezeData> {
  const yesterday = addDays(today, -1);
  const [allHabits, logs, pauses, settings] = await Promise.all([
    repositories.habits.getAll({ includeArchived: true }),
    repositories.habitLogs.getInRange(addDays(today, -HISTORY_DAYS), yesterday),
    repositories.pauses.getAll(),
    repositories.settings.get(),
  ]);
  const active = allHabits.filter((h) => !h.isArchived);
  const statuses = applyPausesToAll(statusesByHabit(logs), allHabits.map((h) => h.id), pauses, yesterday);
  return {
    uses: freezeHistory(allHabits, statuses).slice(0, HISTORY_ROWS),
    titles: new Map(allHabits.map((h) => [h.id, h.title])),
    progress: perfectDaysTowardNextFreeze(active, statuses, today, settings.lastFreezeAwardDate),
  };
}

function FreezeCard({ data }: { data: FreezeData | null }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const freezes = useSettingsStore((s) => s.settings?.streakFreezesAvailable ?? 0);
  const full = freezes >= MAX_STREAK_FREEZES;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.heading}>{t('protect.balance', { count: freezes, max: MAX_STREAK_FREEZES })}</Text>
          <Text style={typography.caption}>{t('protect.freezeLead')}</Text>
        </View>
        <View style={styles.flakes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: MAX_STREAK_FREEZES }, (_, i) => (
            <Ionicons key={i} name="snow" size={24} color={i < freezes ? colors.freeze : colors.border} />
          ))}
        </View>
      </View>

      {full ? (
        <Text style={typography.caption}>{t('protect.full')}</Text>
      ) : data ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.caption}>{t('protect.progress', { days: data.progress, total: PERFECT_WEEK_DAYS })}</Text>
          <ProgressBar value={data.progress / PERFECT_WEEK_DAYS} color={colors.freeze} />
          <Text style={typography.caption}>{t('protect.perfectHint')}</Text>
        </View>
      ) : null}

      <Text style={typography.label}>{t('protect.history')}</Text>
      {data && data.uses.length === 0 ? <Text style={typography.caption}>{t('protect.noUses')}</Text> : null}
      {data?.uses.map((use) => (
        <View key={`${use.habitId}-${use.date}`} style={styles.useRow}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{formatShortDate(use.date)}</Text>
          </View>
          <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
            {data.titles.get(use.habitId) ?? ''}
          </Text>
          {use.streakSaved > 0 ? <Text style={typography.caption}>{t('protect.saved', { count: use.streakSaved })}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

function DayStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: LocalDateString;
  min: LocalDateString;
  max: LocalDateString;
  onChange: (next: LocalDateString) => void;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const step = (delta: number) => {
    const next = addDays(value, delta);
    if (next >= min && next <= max) onChange(next);
  };
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${t('protect.earlierA11y')}`}
        disabled={value <= min}
        onPress={() => step(-1)}
        hitSlop={6}
        style={[styles.stepButton, value <= min && { opacity: 0.35 }]}
      >
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.label}>{formatFriendlyDate(value, t.locale)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${t('protect.laterA11y')}`}
        disabled={value >= max}
        onPress={() => step(1)}
        hitSlop={6}
        style={[styles.stepButton, value >= max && { opacity: 0.35 }]}
      >
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

function PauseForm({ today, editing, onDone }: { today: LocalDateString; editing: Pause | null; onDone: () => void }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const addPause = usePlanningStore((s) => s.addPause);
  const updatePause = usePlanningStore((s) => s.updatePause);
  const [reason, setReason] = useState<PauseReason>(editing?.reason ?? 'vacation');
  const [start, setStart] = useState<LocalDateString>(editing?.startDate ?? today);
  const [end, setEnd] = useState<LocalDateString>(editing?.endDate ?? addDays(today, 6));
  const [error, setError] = useState<string | null>(null);
  const days = pauseLength(start, end);

  const changeStart = (next: LocalDateString) => {
    setStart(next);
    if (end < next) setEnd(next);
    if (pauseLength(next, end) > MAX_PAUSE_DAYS) setEnd(addDays(next, MAX_PAUSE_DAYS - 1));
  };

  const save = () =>
    runDetached(
      (editing ? updatePause(editing.id, start, end, reason) : addPause(start, end, reason)).then(() => {
        setError(null);
        onDone();
      }),
      (e) => setError(t('pause.saveError', { error: toErrorMessage(e) })),
    );

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{editing ? t('protect.editPause') : t('protect.newPause')}</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r.id} label={t(r.label)} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <View style={styles.steppers}>
        <DayStepper label={t('protect.from')} value={start} min={today} max={addDays(today, 365)} onChange={changeStart} />
        <DayStepper label={t('protect.to')} value={end} min={start} max={addDays(start, MAX_PAUSE_DAYS - 1)} onChange={setEnd} />
      </View>
      <Button label={editing ? t('common.save') : t.plural('protect.add', days)} onPress={save} />
      {editing ? <Button label={t('common.cancel')} variant="ghost" onPress={onDone} /> : null}
      {error ? <Banner message={error} /> : null}
    </Card>
  );
}

/** Freezes (balance, progress, history) and planned pauses in one place. */
export function StreakProtectionScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const pauses = usePlanningStore((s) => s.pauses);
  const endPause = usePlanningStore((s) => s.endPause);
  const updatePause = usePlanningStore((s) => s.updatePause);
  const removePause = usePlanningStore((s) => s.removePause);
  const [data, setData] = useState<FreezeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pause | null>(null);
  // Bumped after a save so the "new pause" form resets.
  const [formKey, setFormKey] = useState(0);

  const reload = useCallback(
    () =>
      runDetached(
        loadFreezeData(today).then((d) => {
          setData(d);
          setError(null);
        }),
        (e) => setError(toErrorMessage(e)),
      ),
    [today],
  );
  useFocusEffect(reload);

  // Streaks, freezes and reminders all depend on pauses.
  const afterChange = () => {
    runDetached(useHabitStore.getState().load(today));
    reload();
  };
  const run = (work: Promise<void>) =>
    runDetached(work.then(afterChange), (e) => setError(t('pause.saveError', { error: toErrorMessage(e) })));

  const active = pauses.filter((p) => p.startDate <= today && p.endDate >= today);
  const upcoming = pauses.filter((p) => p.startDate > today);

  const confirmDelete = (pause: Pause) =>
    showConfirm({
      title: t('protect.deleteTitle'),
      message: `${t(reasonLabel(pause.reason))} · ${formatShortDate(pause.startDate)} – ${formatShortDate(pause.endDate)}`,
      confirmLabel: t('protect.deleteConfirm'),
      destructive: true,
      icon: 'trash-outline',
      onConfirm: () => run(removePause(pause.id)),
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t('protect.title')} />
        {error ? <Banner message={error} /> : null}

        <SectionTitle>{t('protect.freezes')}</SectionTitle>
        <FreezeCard data={data} />

        <SectionTitle>{t('protect.pauses')}</SectionTitle>
        {active.map((pause) => (
          <Card key={pause.id} style={[styles.card, { borderWidth: 1.5, borderColor: colors.primary }]}>
            <View style={{ gap: 2 }}>
              <Text style={typography.label}>{t('protect.now', { reason: t(reasonLabel(pause.reason)) })}</Text>
              <Text style={typography.caption}>
                {formatShortDate(pause.startDate)} – {formatShortDate(pause.endDate)} · {t.plural('protect.daysLeft', pauseLength(today, pause.endDate))}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <Button style={{ flex: 1 }} variant="secondary" label={t('protect.endToday')} onPress={() => run(endPause(pause.id, today))} />
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                label={t('protect.extend')}
                onPress={() => run(updatePause(pause.id, pause.startDate, addDays(pause.endDate, 1), pause.reason))}
              />
            </View>
            <Text style={typography.caption}>{t('protect.endNote')}</Text>
          </Card>
        ))}

        {upcoming.map((pause) => (
          <Card key={pause.id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={typography.label}>{t(reasonLabel(pause.reason))}</Text>
                <Text style={typography.caption}>
                  {formatShortDate(pause.startDate)} – {formatShortDate(pause.endDate)} · {t.plural('pause.days', pauseLength(pause.startDate, pause.endDate))}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('protect.editA11y')} onPress={() => setEditing(pause)} hitSlop={6} style={styles.iconButton}>
                <Ionicons name="create-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('protect.deleteA11y')} onPress={() => confirmDelete(pause)} hitSlop={6} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        <PauseForm
          key={editing ? `edit-${editing.id}` : `new-${formKey}`}
          today={today}
          editing={editing}
          onDone={() => {
            setEditing(null);
            setFormKey((k) => k + 1);
            afterChange();
          }}
        />
        <Text style={[typography.caption, styles.footer]}>{t('protect.footer')}</Text>

        <Pressable accessibilityRole="button" onPress={() => router.push('/calendar')} style={({ pressed }) => [styles.link, pressed && { opacity: 0.8 }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[typography.label, { flex: 1, color: colors.primary }]}>{t('protect.calendarLink')}</Text>
          <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flakes: { flexDirection: 'row', gap: 2 },
  useRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  datePill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.freezeSoft },
  datePillText: { fontSize: 13, fontWeight: '700', color: colors.freeze, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  steppers: { flexDirection: 'row', gap: spacing.sm },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  stepButton: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  iconButton: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  footer: { textAlign: 'center', marginTop: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primarySoft, marginTop: spacing.sm },
}));
