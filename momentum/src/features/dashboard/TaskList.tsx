import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { showActionSheet, type SheetAction } from '@/components/Overlay';
import { Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import type { Task } from '@/domain/models';
import { MAX_OPEN_TASKS_PER_DAY } from '@/domain/taskPlanning';
import { highlightFor, useHighlightStore } from '@/state/highlightStore';
import { useTaskStore } from '@/state/taskStore';
import { addDays, type LocalDateString } from '@/core/localDate';
import { dayLabel, nextDays } from '@/features/tasks/PlanAhead';
import { currentLanguage, t, translatorFor, useT } from '@/i18n';

/** Days and tasks per day "Coming up" shows before folding the rest into "+N more". */
const UPCOMING_SHOWN_DAYS = 3;
const UPCOMING_SHOWN_PER_DAY = 3;

function openTaskMenu(task: Task, isMain: boolean) {
  const { decide, today } = useTaskStore.getState();
  const actions: SheetAction[] = [
    ...(today && !task.isCompleted
      ? [{ label: isMain ? t('tasks.unsetMain') : t('tasks.setMain'), icon: isMain ? ('star' as const) : ('star-outline' as const), run: () => useHighlightStore.getState().toggle(today, task.id) }]
      : []),
    ...(today && !task.isCompleted
      ? [
          { label: t('tasks.moveTomorrow'), icon: (currentLanguage() === 'he' ? 'arrow-back-circle-outline' : 'arrow-forward-circle-outline') as 'arrow-back-circle-outline', run: () => useTaskStore.getState().moveToDate(task.id, addDays(today, 1)) },
          { label: t('tasks.moveDay'), icon: 'calendar-outline' as const, run: () => openDayPicker(task) },
        ]
      : []),
    { label: t('tasks.moveLater'), icon: 'time-outline', run: () => decide(task.id, 'later') },
    { label: t('tasks.drop'), icon: 'trash-outline', run: () => decide(task.id, 'drop'), destructive: true },
  ];
  showActionSheet({ title: task.title, actions });
}

/** "Another day…": the coming week to pick from. */
function openDayPicker(task: Task) {
  const { today, moveToDate } = useTaskStore.getState();
  if (!today) return;
  const tr = translatorFor(currentLanguage());
  showActionSheet({
    title: t('tasks.moveDayTitle', { title: task.title }),
    actions: nextDays(today)
      .filter((date) => date !== task.dueDate)
      .map((date) => ({ label: dayLabel(date, today, tr), icon: 'calendar-clear-outline', run: () => moveToDate(task.id, date) })),
  });
}

/** A task planned for the coming week: bring it to today, move it, put it off, or let it go. */
function openUpcomingMenu(task: Task) {
  const { decide } = useTaskStore.getState();
  showActionSheet({
    title: task.title,
    actions: [
      { label: t('tasks.moveToday'), icon: 'today-outline', run: () => decide(task.id, 'today') },
      { label: t('tasks.moveDay'), icon: 'calendar-outline', run: () => openDayPicker(task) },
      { label: t('tasks.moveLater'), icon: 'time-outline', run: () => decide(task.id, 'later') },
      { label: t('tasks.drop'), icon: 'trash-outline', run: () => decide(task.id, 'drop'), destructive: true },
    ],
  });
}

/** "Coming up": what waits in the next few days, so planning ahead doesn't hide the plan. */
function UpcomingTasks({ today }: { today: LocalDateString }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const upcoming = useTaskStore((s) => s.upcoming);
  if (upcoming.length === 0) return null;
  const days: { date: LocalDateString; tasks: Task[] }[] = [];
  for (const task of upcoming) {
    if (!task.dueDate) continue;
    const last = days[days.length - 1];
    if (last?.date === task.dueDate) last.tasks.push(task);
    else days.push({ date: task.dueDate, tasks: [task] });
  }
  const hiddenDays = days.slice(UPCOMING_SHOWN_DAYS).reduce((sum, day) => sum + day.tasks.length, 0);
  return (
    <View style={styles.upcoming}>
      <Text style={typography.overline} accessibilityRole="header">
        {t('tasks.upcoming')}
      </Text>
      {days.slice(0, UPCOMING_SHOWN_DAYS).map((day) => (
        <View key={day.date} style={styles.upcomingDay}>
          <Text style={typography.caption}>{dayLabel(day.date, today, t)}</Text>
          {day.tasks.slice(0, UPCOMING_SHOWN_PER_DAY).map((task) => (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityLabel={t('tasks.upcomingA11y', { title: task.title, day: dayLabel(day.date, today, t) })}
              accessibilityHint={t('tasks.upcomingHint')}
              onPress={() => openUpcomingMenu(task)}
              style={({ pressed }) => [styles.upcomingRow, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.upcomingDot} />
              <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                {task.title}
              </Text>
            </Pressable>
          ))}
          {day.tasks.length > UPCOMING_SHOWN_PER_DAY ? (
            <Text style={typography.caption}>{t('tasks.moreCount', { count: day.tasks.length - UPCOMING_SHOWN_PER_DAY })}</Text>
          ) : null}
        </View>
      ))}
      {hiddenDays > 0 ? <Text style={typography.caption}>{t.plural('tasks.laterInWeek', hiddenDays)}</Text> : null}
    </View>
  );
}

export function TaskList() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const planTask = useTaskStore((s) => s.planTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const today = useTaskStore((s) => s.today);
  const mainId = useHighlightStore((s) => highlightFor(s, today));
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  // Which day a new task goes to; a day that has come (after midnight) means today.
  const [target, setTarget] = useState<LocalDateString | null>(null);
  const forDay = target && today && target > today ? target : null;
  const tomorrow = today ? addDays(today, 1) : null;

  const openCount = tasks.filter((t) => !t.isCompleted).length;
  const isFull = openCount >= MAX_OPEN_TASKS_PER_DAY;

  const submit = () => {
    const title = draft.trim();
    if (title.length === 0 || !today) return;
    setDraft('');
    if (!forDay) {
      const placed = addTask(title);
      setHint(placed === 'later' ? t('tasks.fullSaved') : null);
      return;
    }
    const day = dayLabel(forDay, today, t);
    runDetached(
      planTask(title, forDay).then((task) => {
        if (task) haptics.success();
        else setDraft(title);
        setHint(task ? t('tasks.plannedFor', { day }) : t('plan.failed'));
      }),
    );
  };

  const pickOtherDay = () => {
    if (!today) return;
    showActionSheet({
      title: t('tasks.whenTitle'),
      actions: nextDays(today).map((date) => ({ label: dayLabel(date, today, t), icon: 'calendar-clear-outline', run: () => setTarget(date) })),
    });
  };
  const otherDay = forDay && forDay !== tomorrow ? forDay : null;
  // The day choice shows while typing, and stays while a later day is picked (so it's never a surprise).
  const showDays = today !== null && (focused || draft.length > 0 || forDay !== null);

  // The main task goes first: do the most important thing before the day fills up.
  const ordered = mainId ? [...tasks].sort((a, b) => Number(b.id === mainId) - Number(a.id === mainId)) : tasks;

  return (
    <View style={styles.container}>
      {ordered.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          accessibilityHint={t('tasks.longPressHint')}
          onPress={() => toggleTask(task.id)}
          onLongPress={() => openTaskMenu(task, task.id === mainId)}
          style={styles.row}
        >
          <View style={[styles.box, task.isCompleted && styles.boxDone]}>
            {task.isCompleted ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={[typography.body, { flex: 1 }, task.isCompleted && styles.done]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.id === mainId ? (
            <Text style={styles.main} accessibilityLabel={t('tasks.mainA11y')}>
              {t('tasks.main')}
            </Text>
          ) : null}
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={forDay && today ? t('plan.placeholder', { day: dayLabel(forDay, today, t) }) : isFull ? t('tasks.placeholderFull') : t('tasks.placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          maxLength={120}
          style={styles.input}
          accessibilityLabel={forDay && today ? t('plan.inputA11y', { day: dayLabel(forDay, today, t) }) : t('tasks.newTitleA11y')}
        />
        {forDay ? null : (
          <Text style={styles.counter} accessibilityLabel={t('tasks.counterA11y', { open: openCount, max: MAX_OPEN_TASKS_PER_DAY })}>
            {openCount}/{MAX_OPEN_TASKS_PER_DAY}
          </Text>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.add')} onPress={submit} style={styles.add}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>
      {showDays && today ? (
        <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel={t('tasks.whenA11y')}>
          <Chip label={t('tasks.whenToday')} selected={!forDay} onPress={() => setTarget(null)} />
          <Chip label={t('plan.tomorrow')} selected={forDay !== null && forDay === tomorrow} onPress={() => setTarget(tomorrow)} />
          <Chip label={otherDay ? dayLabel(otherDay, today, t) : t('tasks.moveDay')} selected={otherDay !== null} onPress={pickOtherDay} />
        </View>
      ) : null}
      {hint ? <Text style={[typography.caption, styles.hint]}>{hint}</Text> : null}
      {!mainId && openCount > 1 ? <Text style={[typography.caption, styles.hint]}>{t('tasks.mainHint')}</Text> : null}
      {today ? <UpcomingTasks today={today} /> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography, flat }) => ({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...flat,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.success, borderColor: colors.success },
  tick: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.md },
  counter: { ...typography.caption, fontVariant: ['tabular-nums'] },
  add: { padding: spacing.sm },
  addText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  hint: { paddingBottom: spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  upcoming: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  upcomingDay: { gap: 2 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: colors.primary },
  main: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
}));
