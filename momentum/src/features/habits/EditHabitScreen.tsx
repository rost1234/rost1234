import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/AppText';
import { showConfirm } from '@/components/Overlay';
import { Banner, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { toErrorMessage } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { addDays, formatFriendlyDate } from '@/core/localDate';
import type { Habit } from '@/domain/models';
import { useHabitStore } from '@/state/habitStore';
import { usePlanningStore } from '@/state/planningStore';
import { useT } from '@/i18n';
import { draftFromHabit, extrasCount, toNewHabit, type HabitDraft } from './draft';
import { ExtrasList, type ExtraId } from './ExtrasList';
import { AmountField, ReminderSwitch, ScheduleField, Stepper, TextWithIdeas } from './fields';
import { FormSheet } from './FormSheet';
import { amountText, daysText, timeText } from './summary';

type SheetId = 'title' | 'amount' | 'when' | 'cue' | 'instead' | 'cost' | 'pause';

const PAUSE_DAYS = [7, 14, 30] as const;

function Row({ label, value, onPress, last }: { label: string; value: string; onPress: () => void; last?: boolean }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.7 }]}
    >
      <Text style={[typography.caption, styles.rowLabel]}>{label}</Text>
      <Text style={[typography.body, { flex: 1 }]} numberOfLines={2}>
        {value}
      </Text>
      <Ionicons name={t.language === 'he' ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Box({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.box}>{children}</View>;
}

/** Edit a habit: a short list, and each line opens a small window of its own. Changes save right away. */
export function EditHabitScreen({ habit, open }: { habit: Habit; open?: ExtraId }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const habits = useHabitStore((s) => s.habits);
  const streak = useHabitStore((s) => s.streaks[habit.id] ?? 0);
  const today = useHabitStore((s) => s.today);
  const pauses = usePlanningStore((s) => s.pauses);
  const addPause = usePlanningStore((s) => s.addPause);
  const endPause = usePlanningStore((s) => s.endPause);

  const draft = draftFromHabit(habit);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [local, setLocal] = useState<HabitDraft>(draft);
  const [pauseDays, setPauseDays] = useState<number>(14);
  const [error, setError] = useState<string | null>(null);
  const patchLocal = (p: Partial<HabitDraft>) => setLocal((cur) => ({ ...cur, ...p }));

  // Other habits this one can follow; never itself or one that already follows it.
  const anchors = habits.filter((h) => h.id !== habit.id && h.afterHabitId !== habit.id && !h.isQuit);
  const groupNames = [...new Set(habits.map((h) => h.groupName).filter((g) => g.length > 0))];
  const activePause = today ? pauses.find((p) => p.habitId === habit.id && p.startDate <= today && p.endDate >= today) : undefined;

  const persist = async (changes: Partial<HabitDraft>) => {
    const next = toNewHabit({ ...draftFromHabit(habit), ...changes });
    if (!next.title) return;
    try {
      await updateHabit(habit.id, next);
    } catch (e) {
      setError(t('form.saveError', { error: toErrorMessage(e) }));
    }
  };

  const openSheet = (id: SheetId) => {
    setLocal(draftFromHabit(habit));
    setSheet(id);
  };

  const finish = (changes: Partial<HabitDraft>) => {
    setSheet(null);
    void persist(changes);
  };

  const pause = async () => {
    if (!today) return;
    setSheet(null);
    try {
      await addPause(today, addDays(today, pauseDays - 1), 'other', habit.id);
    } catch (e) {
      setError(t('pause.saveError', { error: toErrorMessage(e) }));
    }
  };

  const resume = async () => {
    if (!today || !activePause) return;
    setSheet(null);
    try {
      await endPause(activePause.id, today);
    } catch (e) {
      setError(t('pause.saveError', { error: toErrorMessage(e) }));
    }
  };

  const archive = () =>
    showConfirm({
      title: t('hf.archiveTitle', { title: habit.title }),
      message: t('hf.archiveBody'),
      confirmLabel: t('habit.archive'),
      destructive: true,
      icon: 'archive-outline',
      onConfirm: () => {
        void archiveHabit(habit.id);
        router.back();
      },
    });

  const costValue = [habit.quitMinutes ? t('hf.costMinutes', { count: habit.quitMinutes }) : null, habit.quitCost ? `${habit.quitCost} ₪` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + spacing.xxl }]}>
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
        <View style={[styles.kept, { backgroundColor: colors.successSoft }]}>
          <Text style={typography.caption}>{streak > 0 ? t.plural('hf.keptStreak', streak) : t('form.keptOnEdit')}</Text>
        </View>

        <Box>
          <Row label={t('hf.rowName')} value={habit.title} onPress={() => openSheet('title')} />
          {habit.isQuit ? (
            <>
              <Row label={t('hf.rowQuitWhen')} value={habit.cue || t('hf.notSet')} onPress={() => openSheet('cue')} />
              <Row label={t('hf.rowInstead')} value={habit.microStep || t('hf.notSet')} onPress={() => openSheet('instead')} />
              <Row label={t('hf.rowWhen')} value={`${daysText(draft, t)} · ${timeText(draft, t)}`} onPress={() => openSheet('when')} />
              <Row label={t('hf.rowCost')} value={costValue || t('hf.notSet')} onPress={() => openSheet('cost')} last />
            </>
          ) : (
            <>
              <Row label={t('hf.rowAmount')} value={amountText(draft, t)} onPress={() => openSheet('amount')} />
              <Row label={t('hf.rowWhen')} value={`${daysText(draft, t)} · ${timeText(draft, t)}`} onPress={() => openSheet('when')} last />
            </>
          )}
        </Box>

        {habit.isQuit ? null : (
          <Box>
            <ReminderSwitch on={habit.reminder === 'smart'} onChange={(on) => void persist({ reminder: on ? 'smart' : 'off' })} />
          </Box>
        )}

        {habit.isQuit ? null : (
          <>
            <Text style={[typography.label, styles.section]}>{t.plural('hf.extrasTitle', extrasCount(draft))}</Text>
            <ExtrasList draft={draft} onApply={(p) => void persist(p)} anchors={anchors} groups={groupNames} initialOpen={open ?? null} />
          </>
        )}

        <Box>
          <Pressable accessibilityRole="button" onPress={() => setSheet('pause')} style={[styles.action, styles.divider]}>
            <Ionicons name="pause-circle-outline" size={20} color={colors.text} />
            <Text style={[typography.body, { flex: 1 }]}>{activePause ? t('hf.pausedUntil', { date: formatFriendlyDate(activePause.endDate, t.locale) }) : t('hf.pause')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={archive} style={styles.action}>
            <Ionicons name="archive-outline" size={20} color={colors.danger} />
            <Text style={[typography.body, { color: colors.danger, flex: 1 }]}>{t('habit.archive')}</Text>
          </Pressable>
        </Box>
      </ScrollView>

      {sheet === 'title' ? (
        <FormSheet title={t('hf.rowName')} onClose={() => setSheet(null)} doneLabel={t('common.done')} onDone={() => finish({ title: local.title })} doneDisabled={local.title.trim().length === 0}>
          <TextInput value={local.title} onChangeText={(title) => patchLocal({ title })} accessibilityLabel={t('hf.rowName')} style={styles.input} maxLength={60} autoFocus />
        </FormSheet>
      ) : null}

      {sheet === 'amount' ? (
        <FormSheet
          title={t('hf.howMuch')}
          onClose={() => setSheet(null)}
          doneLabel={t('common.done')}
          onDone={() => finish({ isQuantitative: local.isQuantitative, targetCount: local.targetCount, unit: local.unit, growthMode: local.growthMode })}
        >
          <AmountField draft={local} onChange={patchLocal} />
        </FormSheet>
      ) : null}

      {sheet === 'when' ? (
        <FormSheet
          title={t('hf.rowWhen')}
          onClose={() => setSheet(null)}
          doneLabel={t('common.done')}
          onDone={() => finish({ targetFrequency: local.targetFrequency, targetDays: local.targetDays, timeOfDay: local.timeOfDay })}
          doneDisabled={local.targetFrequency === 'specific_days' && local.targetDays.length === 0}
        >
          <ScheduleField draft={local} onChange={patchLocal} />
        </FormSheet>
      ) : null}

      {sheet === 'cue' ? (
        <FormSheet title={t('hf.rowQuitWhen')} onClose={() => setSheet(null)} doneLabel={t('common.done')} onDone={() => finish({ cue: local.cue })}>
          <TextWithIdeas value={local.cue} onChange={(cue) => patchLocal({ cue })} placeholder={t('form.quitCuePh')} ideas={[t('hf.quitCueIdea1'), t('hf.quitCueIdea2'), t('hf.quitCueIdea3')]} maxLength={80} label={t('hf.rowQuitWhen')} />
        </FormSheet>
      ) : null}

      {sheet === 'instead' ? (
        <FormSheet title={t('form.instead')} onClose={() => setSheet(null)} doneLabel={t('common.done')} onDone={() => finish({ microStep: local.microStep })}>
          <TextWithIdeas value={local.microStep} onChange={(microStep) => patchLocal({ microStep })} placeholder={t('form.insteadPh')} ideas={[t('hf.insteadIdea1'), t('hf.insteadIdea2'), t('hf.insteadIdea3'), t('hf.insteadIdea4')]} maxLength={100} label={t('form.instead')} />
        </FormSheet>
      ) : null}

      {sheet === 'cost' ? (
        <FormSheet title={t('form.quitCost')} hint={t('form.quitCostHint')} onClose={() => setSheet(null)} doneLabel={t('common.done')} onDone={() => finish({ quitMinutes: local.quitMinutes, quitCost: local.quitCost })}>
          <Text style={typography.label}>{t('form.quitMinutes')}</Text>
          <Stepper value={local.quitMinutes ?? 0} step={5} max={1440} onChange={(quitMinutes) => patchLocal({ quitMinutes })} unit={t('hf.unitMinutes')} label={t('form.quitMinutes')} />
          <Text style={typography.label}>{t('form.quitMoney')}</Text>
          <Stepper value={local.quitCost ?? 0} max={99999} onChange={(quitCost) => patchLocal({ quitCost })} unit="₪" label={t('form.quitMoney')} />
        </FormSheet>
      ) : null}

      {sheet === 'pause' ? (
        activePause ? (
          <FormSheet title={t('hf.pausedTitle', { title: habit.title })} hint={t('hf.pausedHint')} onClose={() => setSheet(null)} doneLabel={t('hf.resume')} onDone={() => void resume()} />
        ) : (
          <FormSheet title={t('hf.pauseTitle', { title: habit.title })} hint={t('hf.pauseHint')} onClose={() => setSheet(null)} doneLabel={t('hf.pauseDo')} onDone={() => void pause()}>
            <View style={styles.chips}>
              {PAUSE_DAYS.map((days) => (
                <Chip key={days} label={t(days === 7 ? 'hf.week' : days === 14 ? 'hf.twoWeeks' : 'hf.month')} selected={pauseDays === days} onPress={() => setPauseDays(days)} />
              ))}
            </View>
          </FormSheet>
        )
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  kept: { borderRadius: radius.md, padding: spacing.md },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  rowLabel: { width: 96 },
  section: { marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
}));
