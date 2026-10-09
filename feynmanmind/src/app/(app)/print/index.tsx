import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, InlineError, LoadingState, ProgressBar, Screen, SectionHeader, Segmented, Stepper, type IconName } from '@/components/ui';
import { nextStations, printableCourses, printKit, rememberKit, scheduledReviews, shareKitPdf, writeMissingLessons } from '@/data/printKit';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { haptics } from '@/lib/haptics';
import { buildKitHtml, pageCount, type PaperMode } from '@/print/html';
import { lessonSlots, planMonth } from '@/print/plan';
import { usePrefsStore } from '@/state/prefsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

const MODES: { value: PaperMode; icon: IconName }[] = [
  { value: 'full', icon: 'documents-outline' },
  { value: 'saver', icon: 'leaf-outline' },
  { value: 'max', icon: 'leaf' },
  { value: 'track', icon: 'calendar-outline' },
];

/**
 * "Learn without a phone": prints a month — a wall calendar of what to learn
 * and review each day, a topic tracker, the lessons and cut-out flashcards —
 * in four paper-saving modes, in colour or black and white. Lessons the AI
 * hasn't written yet are written first. The kit is remembered so the results
 * can be entered from the paper afterwards.
 */
export default function PrintScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const aiReady = useAiConfigured();
  const prefs = usePrefsStore();
  const courses = printableCourses();
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(now.getDate() > 20 ? 1 : 0);
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const chosen = prefs.printCourses.filter((id) => courses.some((c) => c.course.id === id));
  const selected = chosen.length ? chosen : courses.slice(0, 1).map((c) => c.course.id);
  const planOpts = { year: target.getFullYear(), month: target.getMonth(), studyDays: prefs.printDays, perDay: prefs.printPerDay };
  const slots = lessonSlots(planOpts);
  // Recomputed on every render: a few hundred stations at most, and lessons written in the meantime show up.
  const stations = nextStations(selected, slots);
  const toWrite = stations.filter((s) => !s.parts && !s.text).length;
  // Lessons not written yet come with about 4 cards each.
  const cards = stations.reduce((n, s) => n + s.cards.length, 0) + (aiReady ? toWrite * 4 : 0);
  const [busy, setBusy] = useState<null | { done: number; total: number }>(null);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  const monthName = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString(t.locale, { month: 'long' });
  const monthLabel = target.toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });

  const toggleCourse = (id: string) => {
    const next = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
    if (next.length) prefs.set({ printCourses: next });
  };
  const toggleDay = (d: number) => {
    const next = prefs.printDays.includes(d) ? prefs.printDays.filter((x) => x !== d) : [...prefs.printDays, d].sort();
    if (next.length) prefs.set({ printDays: next });
  };

  const run = async (share: boolean) => {
    setError(null);
    try {
      let list = stations;
      if (prefs.printMode !== 'track' && toWrite > 0 && aiReady) {
        setBusy({ done: 0, total: toWrite });
        list = await writeMissingLessons(stations, (done, total) => setBusy({ done, total }));
      }
      const plan = planMonth(list, planOpts);
      const title = selected.map((id) => courses.find((c) => c.course.id === id)?.course.title ?? '').join(' + ');
      const html = buildKitHtml(plan, { mode: prefs.printMode, color: prefs.printColor, monthLabel, title, carryover: scheduledReviews(plan.year, plan.month) });
      setBusy(null);
      if (share) await shareKitPdf(html, `FeynmanMind ${monthLabel}.pdf`);
      else await printKit(html);
      rememberKit(plan);
      haptics.success();
      setPrinted(true);
    } catch {
      setError(t('print.failed'));
    } finally {
      setBusy(null);
    }
  };

  const weekdays = Array.from({ length: 7 }, (_, d) => new Date(2026, 1, 1 + d).toLocaleDateString(t.locale, { weekday: 'narrow' }));

  return (
    <Screen>
      <Text style={typography.body}>{t('print.intro')}</Text>

      <SectionHeader title={t('print.courses')} />
      <View style={styles.chips}>
        {courses.map(({ course, started }) => {
          const on = selected.includes(course.id);
          return (
            <Pressable
              key={course.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleCourse(course.id)}
              style={[styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Ionicons name={course.icon as IconName} size={16} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.chipText, { color: on ? colors.onPrimary : colors.text }]}>
                {course.title}
                {started ? ' •' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={t('print.month')} />
      <Segmented<string> value={String(monthOffset)} onChange={(v) => setMonthOffset(Number(v))} options={[0, 1, 2].map((o) => ({ value: String(o), label: monthName(o) }))} />

      <SectionHeader title={t('print.days')} />
      <View style={styles.days}>
        {weekdays.map((name, d) => {
          const on = prefs.printDays.includes(d);
          return (
            <Pressable
              key={d}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={new Date(2026, 1, 1 + d).toLocaleDateString(t.locale, { weekday: 'long' })}
              onPress={() => toggleDay(d)}
              style={[styles.day, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.dayText, { color: on ? colors.onPrimary : colors.textMuted }]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={typography.caption}>{t('print.daysHint')}</Text>
      <Card style={styles.row}>
        <Text style={[typography.subheading, { flex: 1 }]}>{t('print.perDay')}</Text>
        <Stepper value={prefs.printPerDay} min={1} max={3} onChange={(printPerDay) => prefs.set({ printPerDay })} />
      </Card>

      <SectionHeader title={t('print.paper')} />
      {MODES.map((m) => {
        const pages = pageCount(m.value, stations.length, cards);
        const on = prefs.printMode === m.value;
        return (
          <Pressable
            key={m.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => prefs.set({ printMode: m.value })}
            style={[styles.mode, on && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name={m.icon} size={22} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={typography.subheading}>
                {t(`print.mode.${m.value}`)}
                {m.value === 'saver' ? ' ⭐' : ''}
              </Text>
              <Text style={typography.caption}>{t(`print.mode.${m.value}.body`)}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.pages}>{pages}</Text>
              <Text style={typography.caption}>{t('print.pages')}</Text>
              <Text style={[typography.caption, { fontSize: 11 }]}>{t('print.sheets', { n: Math.ceil(pages / 2) })}</Text>
            </View>
          </Pressable>
        );
      })}

      <SectionHeader title={t('print.colorTitle')} />
      <Segmented<'color' | 'bw'>
        value={prefs.printColor ? 'color' : 'bw'}
        onChange={(v) => prefs.set({ printColor: v === 'color' })}
        options={[
          { value: 'color', label: t('print.color') },
          { value: 'bw', label: t('print.bw') },
        ]}
      />
      <Text style={typography.caption}>{prefs.printColor ? t('print.colorHint') : t('print.bwHint')}</Text>

      <Card style={{ gap: spacing.xs }}>
        <Text style={typography.subheading}>{t('print.summary', { month: monthLabel })}</Text>
        <Text style={typography.body}>{t('print.summaryBody', { lessons: stations.length, cards })}</Text>
        {stations.length < slots ? <Text style={typography.caption}>{t('print.fewer', { n: stations.length })}</Text> : null}
        {toWrite && prefs.printMode !== 'track' ? (
          <Text style={[typography.caption, { color: aiReady ? colors.textMuted : colors.danger }]}>
            {aiReady ? t('print.toWrite', { n: toWrite }) : t('print.toWriteOffline', { n: toWrite })}
          </Text>
        ) : null}
        <Text style={typography.caption}>💡 {t('print.duplex')}</Text>
      </Card>

      {busy ? (
        <View style={{ gap: spacing.sm }}>
          <LoadingState label={t('print.writing', { done: busy.done, total: busy.total })} />
          <ProgressBar value={busy.total ? busy.done / busy.total : 0} />
        </View>
      ) : (
        <>
          <Button label={t('print.print')} icon="print-outline" onPress={() => void run(false)} disabled={!stations.length} />
          <Button label={t('print.share')} icon="share-outline" variant="secondary" onPress={() => void run(true)} disabled={!stations.length} />
        </>
      )}
      <InlineError message={error} />
      {printed ? (
        <Card style={{ gap: spacing.xs, borderColor: colors.success }}>
          <Text style={typography.subheading}>✓ {t('print.done')}</Text>
          <Text style={typography.caption}>{t('print.doneBody')}</Text>
          <Button label={t('print.back')} variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    backgroundColor: colors.surface,
  },
  chipText: { fontWeight: '700', fontSize: Math.round(14 * textScale) },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dayText: { fontWeight: '800', fontSize: Math.round(15 * textScale) },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  pages: { color: colors.text, fontSize: Math.round(22 * textScale), fontWeight: '800' },
}));
