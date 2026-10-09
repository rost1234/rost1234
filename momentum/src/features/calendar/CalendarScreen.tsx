import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { SheetHeader } from '@/components/SheetHeader';
import { Banner, Button, Card, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme, type Theme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { runDetached, toErrorMessage } from '@/core/errors';
import {
  addDays,
  addMonths,
  dayOfMonth,
  formatLongDate,
  formatShortDate,
  localDateFromIso,
  monthDays,
  monthGrid,
  monthLabel,
  monthStart,
  parseLocalDate,
  weekdayLabel,
  type LocalDateString,
  type Weekday,
} from '@/core/localDate';
import { repositories } from '@/data/repositories';
import type { HeatCellState } from '@/domain/analytics';
import {
  applyDayEdit,
  buildCalendarDays,
  dayEditActions,
  habitDayDetails,
  summarizeMonth,
  type CalendarDay,
  type DayEditAction,
  type HabitDayDetail,
} from '@/domain/calendar';
import { progressOf } from '@/domain/habitProgress';
import type { DailyReflection, FocusSession, Habit, HabitLog, Pause, Task } from '@/domain/models';
import { MOOD_OPTIONS } from '@/features/reflection/mood';
import { useReflectionAccess } from '@/features/reflection/ReflectionLock';
import { useLocalDate } from '@/hooks/useLocalDate';
import { printMonthReport } from '@/services/printReport';
import { useHabitStore } from '@/state/habitStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useT, type TranslationKey } from '@/i18n';

/** How far back the arrows go. */
const MAX_MONTHS_BACK = 24;
const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const RING = 36;
const STROKE = 3;

interface MonthData {
  month: LocalDateString;
  habits: Habit[];
  logs: HabitLog[];
  pauses: Pause[];
  reflections: DailyReflection[];
  sessions: FocusSession[];
}

async function loadMonth(month: LocalDateString): Promise<MonthData> {
  const days = monthDays(month);
  const start = days[0] ?? month;
  const end = days[days.length - 1] ?? month;
  const startIso = new Date(parseLocalDate(start).setHours(0, 0, 0, 0)).toISOString();
  const endIso = new Date(parseLocalDate(addDays(end, 1)).setHours(0, 0, 0, 0)).toISOString();
  const [habits, logs, pauses, reflections, sessions] = await Promise.all([
    repositories.habits.getAll({ includeArchived: true }),
    repositories.habitLogs.getInRange(start, end),
    repositories.pauses.getAll(),
    repositories.reflections.getInRange(start, end),
    repositories.focusSessions.getInRange(startIso, endIso),
  ]);
  return { month, habits, logs, pauses, reflections, sessions };
}

function DayRing({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const r = (RING - STROKE) / 2 - 1;
  const circumference = 2 * Math.PI * r;
  const percent = day.percent ?? 0;
  const tracked = !day.future && day.percent !== null;
  const stroke = day.perfect ? colors.success : colors.partial;
  const number = dayOfMonth(day.date);

  return (
    <View style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING}>
        {tracked ? <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.border} strokeWidth={STROKE} fill={day.perfect ? colors.successSoft : 'transparent'} /> : null}
        {tracked && percent > 0 ? (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={r}
            stroke={stroke}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - percent / 100)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        ) : null}
        {isToday ? <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 1} stroke={colors.primary} strokeWidth={2} fill="none" /> : null}
      </Svg>
      <View style={styles.ringLabel}>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            styles.dayNumber,
            day.perfect && { color: colors.success, fontWeight: '800' },
            isToday && { color: colors.primary, fontWeight: '800' },
            (day.future || !tracked) && !isToday && { color: colors.textMuted, fontWeight: '500' },
          ]}
        >
          {number}
        </Text>
      </View>
      {day.freezes > 0 ? (
        <View style={styles.freezeBadge}>
          <Ionicons name="snow" size={10} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const REASON_ICON: Record<Pause['reason'], keyof typeof Ionicons.glyphMap> = {
  vacation: 'airplane-outline',
  sick: 'medkit-outline',
  other: 'pause-outline',
};

function dayA11y(day: CalendarDay, t: ReturnType<typeof useT>): string {
  const parts = [formatLongDate(day.date, t.locale)];
  if (day.pause) parts.push(t('cal.a11yPaused'));
  if (!day.future && day.percent !== null) parts.push(`${day.percent}%`);
  if (day.freezes > 0) parts.push(t.plural('cal.a11yFreezes', day.freezes));
  return parts.join(', ');
}

function MonthGrid({
  days,
  today,
  selected,
  onSelect,
}: {
  days: ReadonlyMap<LocalDateString, CalendarDay>;
  today: LocalDateString;
  selected: LocalDateString | null;
  onSelect: (date: LocalDateString) => void;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const first = days.keys().next().value ?? today;
  const weeks = monthGrid(first);
  const paused = (date: LocalDateString | null | undefined) => (date ? days.get(date)?.pause != null : false);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.week}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={[typography.caption, styles.weekday]}>
            {weekdayLabel(d, t.locale)}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((date, col) => {
            const day = date ? days.get(date) : undefined;
            if (!date || !day) return <View key={col} style={styles.cell} />;
            const isPaused = day.pause !== null;
            const startsBand = isPaused && (col === 0 || !paused(week[col - 1]));
            const endsBand = isPaused && (col === 6 || !paused(week[col + 1]));
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={dayA11y(day, t)}
                accessibilityState={{ selected: date === selected }}
                disabled={day.future && !isPaused}
                onPress={() => onSelect(date)}
                style={[
                  styles.cell,
                  isPaused && styles.band,
                  startsBand && styles.bandStart,
                  endsBand && styles.bandEnd,
                  date === selected && { backgroundColor: colors.primarySoft, borderRadius: radius.md },
                ]}
              >
                {startsBand && day.pause ? <Ionicons name={REASON_ICON[day.pause.reason]} size={11} color={colors.primary} style={styles.bandIcon} /> : null}
                <DayRing day={day} isToday={date === today} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Legend() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const items: { key: TranslationKey; swatch: object }[] = [
    { key: 'cal.legendPerfect', swatch: { backgroundColor: colors.successSoft, borderColor: colors.success, borderWidth: 2 } },
    { key: 'cal.legendPartial', swatch: { borderColor: colors.partial, borderWidth: 2 } },
    { key: 'cal.legendFreeze', swatch: { backgroundColor: colors.freeze } },
    { key: 'cal.legendPause', swatch: { backgroundColor: colors.primarySoft, borderRadius: 4 } },
    { key: 'cal.legendToday', swatch: { borderColor: colors.primary, borderWidth: 2 } },
  ];
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.key} style={styles.legendItem}>
          <View style={[styles.swatch, item.swatch]} />
          <Text style={typography.caption}>{t(item.key)}</Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ value, label, tint }: { value: string; label: string; tint?: string }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={[typography.caption, { textAlign: 'center' }]}>{label}</Text>
    </Card>
  );
}

const STATE_PILL: Record<Exclude<HeatCellState, 'not_scheduled'>, { label: TranslationKey; tone: (c: Theme['colors']) => [string, string] }> = {
  completed: { label: 'cal.stateDone', tone: (c) => [c.successSoft, c.success] },
  partial: { label: 'cal.statePartial', tone: (c) => [c.surfaceMuted, c.text] },
  forgiven: { label: 'cal.stateFreeze', tone: (c) => [c.freezeSoft, c.freeze] },
  skipped: { label: 'cal.stateSkipped', tone: (c) => [c.surfaceMuted, c.textMuted] },
  paused: { label: 'cal.statePaused', tone: (c) => [c.primarySoft, c.primary] },
  missed: { label: 'cal.stateMissed', tone: (c) => [c.surfaceMuted, c.textMuted] },
  pending: { label: 'cal.statePending', tone: (c) => [c.surfaceMuted, c.textMuted] },
};

const ACTION_LABEL: Record<DayEditAction, TranslationKey> = {
  done: 'cal.act.done',
  undo: 'cal.act.undo',
  plus: 'cal.act.plus',
  minus: 'cal.act.minus',
  skip: 'cal.act.skip',
  unskip: 'cal.act.unskip',
};

function DetailRow({
  detail,
  isToday,
  editable,
  expanded,
  busy,
  onToggle,
  onAction,
  onEditHabit,
}: {
  detail: HabitDayDetail;
  isToday: boolean;
  /** False for days that haven't come yet. */
  editable: boolean;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onAction: (action: DayEditAction) => void;
  onEditHabit: () => void;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  if (detail.state === 'not_scheduled') return null;
  const pill = STATE_PILL[detail.state];
  const [bg, fg] = pill.tone(colors);
  const { habit } = detail;
  const label =
    detail.state === 'partial' && habit.isQuantitative
      ? `◐ ${detail.count}/${habit.targetCount}`
      : detail.state === 'completed' && habit.isQuit
        ? t('cal.stateQuitDone')
        : t(pill.label);
  const note =
    detail.state === 'forgiven'
      ? t('cal.freezeNote')
      : habit.isQuantitative
        ? `${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`
        : habit.microStep;
  const actions = editable ? dayEditActions(habit, detail.state, detail.count, isToday) : [];
  const canEdit = editable && !habit.isArchived;
  // One tap on the circle: mark it done, or clear it when it already is.
  const quick: DayEditAction | null = actions.includes('done') ? 'done' : actions.includes('undo') ? 'undo' : null;
  const actionLabel = (action: DayEditAction) =>
    habit.isQuit && action === 'done' ? t('cal.act.quitDone') : habit.isQuit && action === 'undo' ? t('cal.act.quitUndo') : t(ACTION_LABEL[action]);
  return (
    <View style={styles.detailBlock}>
      <View style={styles.detailRow}>
        {canEdit && quick ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              quick === 'done'
                ? t(habit.isQuit ? 'cal.quick.quitDone' : 'cal.quick.done', { title: habit.title })
                : t('cal.quick.undo', { title: habit.title })
            }
            onPress={() => (busy ? undefined : onAction(quick))}
            style={styles.quickButton}
          >
            <View style={[styles.quickCircle, detail.state === 'completed' && { backgroundColor: colors.success, borderColor: colors.success }]}>
              {detail.state === 'completed' ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
            </View>
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.label} numberOfLines={1}>
            {habit.title}
          </Text>
          {note ? (
            <Text style={typography.caption} numberOfLines={2}>
              {note}
            </Text>
          ) : null}
        </View>
        <View style={[styles.pill, { backgroundColor: bg }]}>
          <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
        </View>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={t('cal.editA11y', { title: habit.title })}
            onPress={onToggle}
            hitSlop={6}
            style={[styles.editButton, expanded && { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name="create-outline" size={18} color={expanded ? colors.primary : colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {expanded && canEdit ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Chip
              key={action}
              label={actionLabel(action)}
              accessibilityLabel={`${actionLabel(action)}: ${habit.title}`}
              selected={false}
              onPress={() => (busy ? undefined : onAction(action))}
            />
          ))}
          <Chip label={t('cal.act.editHabit')} accessibilityLabel={`${t('cal.act.editHabit')}: ${habit.title}`} selected={false} onPress={onEditHabit} />
        </View>
      ) : null}
    </View>
  );
}

function TaskRow({ task }: { task: Task }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.taskRow}
      accessible
      accessibilityLabel={`${task.title}, ${task.isCompleted ? t('cal.taskDone') : t('cal.taskOpen')}`}
    >
      <Ionicons
        name={task.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={task.isCompleted ? colors.success : colors.textMuted}
      />
      <Text style={[typography.body, { flex: 1 }, task.isCompleted && { color: colors.textMuted }]}>{task.title}</Text>
    </View>
  );
}

function ReflectionBlock({ reflection }: { reflection: DailyReflection | undefined }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const { canRead, ask } = useReflectionAccess();
  if (!reflection) return <Text style={[typography.caption, { paddingVertical: spacing.sm }]}>{t('cal.noReflection')}</Text>;
  const mood = MOOD_OPTIONS.find((m) => m.score === reflection.moodScore);
  if (!canRead) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={t('cal.openReflection')} onPress={() => runDetached(ask())} style={styles.lockedReflection}>
        <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
        <Text style={[typography.label, { flex: 1 }]}>{t('cal.openReflection')}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.reflection}>
      {mood ? (
        <Text style={typography.label} accessibilityLabel={t('refl.moodA11y', { label: t(mood.label), score: mood.score })}>
          {`${mood.emoji} ${t(mood.label)}`}
        </Text>
      ) : null}
      {reflection.gratitudeText ? (
        <View style={{ gap: 2 }}>
          <Text style={typography.overline}>{t('cal.gratitude')}</Text>
          <Text style={typography.body}>{reflection.gratitudeText}</Text>
        </View>
      ) : null}
      {reflection.lessonText ? (
        <View style={{ gap: 2 }}>
          <Text style={typography.overline}>{t('cal.lesson')}</Text>
          <Text style={typography.body}>{reflection.lessonText}</Text>
        </View>
      ) : null}
      {reflection.sleepMinutes ? (
        <Text style={typography.caption}>{t('cal.sleep', { hours: Math.round((reflection.sleepMinutes / 60) * 10) / 10 })}</Text>
      ) : null}
    </View>
  );
}

function DaySheet({
  date,
  data,
  today,
  habitId,
  onChanged,
  onClose,
}: {
  date: LocalDateString | null;
  data: MonthData;
  today: LocalDateString;
  habitId: string | null;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottom = useSafeAreaInsets().bottom;
  const maxHeight = useWindowDimensions().height * 0.7;
  const scrollRef = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({});
  const [note, setNote] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const details = useMemo(
    () => (date ? habitDayDetails(habitId ? data.habits.filter((h) => h.id === habitId) : data.habits, data.logs, data.pauses, date, today) : []),
    [date, data, today, habitId],
  );

  // Tasks planned for the day, open or done (a completed task keeps that day's date).
  useEffect(() => {
    if (!date) return;
    let current = true;
    runDetached(
      repositories.tasks
        .getForDate(date)
        .catch((): Task[] => [])
        .then((list) => {
          if (current) setTasks(list);
        }),
    );
    return () => {
      current = false;
    };
  }, [date]);

  if (!date) return null;

  // Habits that didn't exist yet that day, so a missing row isn't a mystery.
  const later = (habitId ? data.habits.filter((h) => h.id === habitId) : data.habits).filter(
    (h) => !h.isArchived && localDateFromIso(h.createdAt) > date,
  );
  const createdOn = (h: Habit | undefined) => (h ? formatShortDate(localDateFromIso(h.createdAt)) : '');
  const counted = details.filter((d) => d.state !== 'skipped' && d.state !== 'paused');
  const done = details.filter((d) => d.state === 'completed').length;
  const freezes = details.filter((d) => d.state === 'forgiven').length;
  const minutes = data.sessions.filter((s) => localDateFromIso(s.startTime) === date).reduce((sum, s) => sum + s.durationMinutes, 0);
  const reflection = data.reflections.find((r) => r.logDate === date);
  const summary = [
    counted.length > 0 ? t('cal.dayDone', { done, total: counted.length }) : null,
    freezes > 0 ? t.plural('cal.dayFreezes', freezes) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const act = (detail: HabitDayDetail, action: DayEditAction) => {
    const log = data.logs.find((l) => l.habitId === detail.habit.id && l.logDate === date);
    const freezes = () => useSettingsStore.getState().settings?.streakFreezesAvailable ?? 0;
    const before = freezes();
    setBusy(true);
    setNote(null);
    setError(null);
    runDetached(
      useHabitStore
        .getState()
        .setProgressOnDate(detail.habit.id, date, applyDayEdit(detail.habit, progressOf(log), action))
        .then(async (refunded) => {
          await onChanged();
          // A change can spend a freeze to keep a streak, or give one back; say so instead of doing it silently.
          if (refunded) setNote('cal.note.freezeBack');
          else if (freezes() < before) setNote('cal.note.freezeUsed');
        })
        .catch((e: unknown) => setError(toErrorMessage(e)))
        .finally(() => setBusy(false)),
    );
  };
  const toggleRow = (id: string) => {
    const opening = expandedId !== id;
    setExpandedId(opening ? id : null);
    if (opening) setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, (rowY.current[id] ?? 0) - 8), animated: true }), 60);
  };
  const editHabit = (id: string) => {
    onClose();
    router.push({ pathname: '/habit/[id]', params: { id } });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: bottom + spacing.lg }]}>
        <View style={styles.grab} />
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.heading}>{formatLongDate(date, t.locale)}</Text>
            {summary ? <Text style={typography.caption}>{summary}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('sheet.close')} onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView ref={scrollRef} style={{ maxHeight }} contentContainerStyle={{ gap: spacing.xs }}>
          <Text style={typography.overline}>{t('cal.habitsTitle')}</Text>
          {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}
          {note ? (
            <View style={styles.note} accessibilityLiveRegion="polite">
              <Text style={typography.body}>{t(note)}</Text>
            </View>
          ) : null}
          {date > today ? <Text style={[typography.caption, { paddingVertical: spacing.sm }]}>{t('cal.notYet')}</Text> : null}
          {details.length === 0 && date <= today ? (
            <Text style={[typography.caption, { paddingVertical: spacing.md }]}>
              {later.length > 0 ? t.plural('cal.createdLater', later.length, { title: later[0]?.title ?? '', date: createdOn(later[0]) }) : t('cal.nothingDue')}
            </Text>
          ) : null}
          {details.map((d) => (
            <View key={d.habit.id} onLayout={(e) => (rowY.current[d.habit.id] = e.nativeEvent.layout.y)}>
              <DetailRow
                detail={d}
                isToday={date === today}
                editable={date <= today}
                expanded={expandedId === d.habit.id}
                busy={busy}
                onToggle={() => toggleRow(d.habit.id)}
                onAction={(action) => act(d, action)}
                onEditHabit={() => editHabit(d.habit.id)}
              />
            </View>
          ))}
          {details.length > 0 && later.length > 0 ? (
            <Text style={[typography.caption, { paddingVertical: spacing.xs }]}>
              {t.plural('cal.createdLater', later.length, { title: later[0]?.title ?? '', date: createdOn(later[0]) })}
            </Text>
          ) : null}

          {tasks.length > 0 ? (
            <>
              <Text style={[typography.overline, styles.sectionGap]}>{t('cal.tasksTitle')}</Text>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </>
          ) : null}

          <Text style={[typography.overline, styles.sectionGap]}>{t('cal.reflectionTitle')}</Text>
          <ReflectionBlock reflection={reflection} />

          {minutes > 0 ? (
            <View style={[styles.meta, styles.sectionGap]}>
              <Text style={styles.metaValue}>{t('focus.minutes', { minutes })}</Text>
              <Text style={typography.caption}>{t('cal.focus')}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** A month at a glance: every day's habits, freezes and pauses. */
export function CalendarScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const thisMonth = monthStart(today);
  const [month, setMonth] = useState(thisMonth);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [selected, setSelected] = useState<LocalDateString | null>(null);
  // The last day opened stays marked on the grid after the sheet closes.
  const [highlight, setHighlight] = useState<LocalDateString | null>(null);
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withTasks, setWithTasks] = useState(true);
  const [withReflections, setWithReflections] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { canRead, ask } = useReflectionAccess();

  // Resolves once the month is on screen again, so an edit can wait for fresh data.
  const refresh = useCallback(
    () =>
      loadMonth(month).then(
        (d) => {
          setData(d);
          setError(null);
        },
        (e: unknown) => setError(toErrorMessage(e)),
      ),
    [month],
  );
  useFocusEffect(
    useCallback(() => {
      runDetached(refresh());
    }, [refresh]),
  );

  const days = useMemo(() => {
    if (!data || data.month !== month) return null;
    const list = buildCalendarDays(data.habits, data.logs, data.pauses, monthDays(month), today, habitId);
    return { byDate: new Map(list.map((d) => [d.date, d] as const)), summary: summarizeMonth(list) };
  }, [data, month, today, habitId]);

  const print = async () => {
    if (!data || data.month !== month || printing) return;
    // Reflections are private: ask for the fingerprint / PIN first when the lock is on.
    if (withReflections && !canRead && !(await ask())) return;
    setPrinting(true);
    try {
      await printMonthReport({
        month,
        today,
        habits: data.habits,
        logs: data.logs,
        pauses: data.pauses,
        reflections: data.reflections,
        habitId,
        includeTasks: withTasks,
        includeReflections: withReflections,
        t,
      });
    } catch (e) {
      setError(t('print.error', { error: toErrorMessage(e) }));
    } finally {
      setPrinting(false);
    }
  };

  // Archived habits still count toward past days, but can't be picked as a filter.
  const activeHabits = useMemo(() => data?.habits.filter((h) => !h.isArchived) ?? [], [data]);
  const canGoBack = month > addMonths(thisMonth, -MAX_MONTHS_BACK);
  const canGoForward = month < thisMonth;
  const prevIcon = t.isRTL ? 'chevron-forward' : 'chevron-back';
  const nextIcon = t.isRTL ? 'chevron-back' : 'chevron-forward';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t('cal.title')} />
        {error ? <Banner message={error} /> : null}

        {activeHabits.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('cal.allHabits')} selected={habitId === null} onPress={() => setHabitId(null)} />
            {activeHabits.map((h) => (
              <Chip key={h.id} label={h.title} selected={habitId === h.id} onPress={() => setHabitId(h.id)} />
            ))}
          </ScrollView>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cal.prevMonth')}
              disabled={!canGoBack}
              onPress={() => {
                setHighlight(null);
                setMonth(addMonths(month, -1));
              }}
              hitSlop={8}
              style={[styles.arrow, !canGoBack && { opacity: 0.35 }]}
            >
              <Ionicons name={prevIcon} size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.monthLabel} accessibilityRole="header">
              {monthLabel(month, t.locale)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cal.nextMonth')}
              disabled={!canGoForward}
              onPress={() => {
                setHighlight(null);
                setMonth(addMonths(month, 1));
              }}
              hitSlop={8}
              style={[styles.arrow, !canGoForward && { opacity: 0.35 }]}
            >
              <Ionicons name={nextIcon} size={20} color={colors.text} />
            </Pressable>
          </View>
          {days ? <MonthGrid
              days={days.byDate}
              today={today}
              selected={highlight}
              onSelect={(date) => {
                setHighlight(date);
                setSelected(date);
              }}
            /> : <View style={{ height: 300 }} />}
          <Legend />
        </Card>

        {days ? (
          <View style={styles.stats}>
            <Stat value={`${days.summary.perfectDays}`} label={t('cal.statPerfect')} />
            <Stat value={`${days.summary.freezesUsed}`} label={t('cal.statFreezes')} tint={colors.freeze} />
            <Stat value={`${days.summary.pausedDays}`} label={t('cal.statPaused')} tint={colors.primary} />
            <Stat value={days.summary.averagePercent === null ? '—' : `${days.summary.averagePercent}%`} label={t('cal.statCompletion')} tint={colors.success} />
          </View>
        ) : null}
        <Text style={[styles.hint]}>{t('cal.tapHint')}</Text>

        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.label}>{t('print.include')}</Text>
          <View style={styles.printChips}>
            <Chip label={t('print.withTasks')} selected={withTasks} onPress={() => setWithTasks(!withTasks)} />
            <Chip label={t('print.withReflections')} selected={withReflections} onPress={() => setWithReflections(!withReflections)} />
          </View>
          <Button label={t('print.button')} variant="secondary" onPress={() => void print()} loading={printing} disabled={!days} />
          <Text style={typography.caption}>{t('print.hint')}</Text>
        </Card>
      </ScrollView>
      {data && selected ? <DaySheet date={selected} data={data} today={today} habitId={habitId} onChanged={refresh} onClose={() => setSelected(null)} /> : null}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  printChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  monthLabel: { ...typography.heading },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '600' },
  cell: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  band: { backgroundColor: colors.primarySoft },
  bandStart: { borderTopStartRadius: 14, borderBottomStartRadius: 14 },
  bandEnd: { borderTopEndRadius: 14, borderBottomEndRadius: 14 },
  bandIcon: { position: 'absolute', top: 0, start: 3, fontSize: 10 },
  ringLabel: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  freezeBadge: {
    position: 'absolute',
    bottom: -2,
    start: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.freeze,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, rowGap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  hint: { ...typography.caption, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(8, 9, 24, 0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.xs },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  detailBlock: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  quickButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quickCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  note: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.freezeSoft },
  editButton: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  sectionGap: { marginTop: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs + 2 },
  reflection: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  lockedReflection: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 12, fontWeight: '700' },
  meta: { alignItems: 'center', gap: 2, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  metaValue: { fontSize: 16, fontWeight: '700', color: colors.text },
}));
