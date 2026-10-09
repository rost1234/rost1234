import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { SheetHeader } from '@/components/SheetHeader';
import { Banner, Button, Card, Chip } from '@/components/ui';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { toErrorMessage } from '@/core/errors';
import { addDays, monthLabel, monthStart } from '@/core/localDate';
import { SHEET_KINDS, type CalendarFields, type SheetKind } from '@/domain/printSheets';
import { useReflectionAccess } from '@/features/reflection/ReflectionLock';
import { useLocalDate } from '@/hooks/useLocalDate';
import { printMonthReport, loadReportData } from '@/services/printReport';
import { printSheet, type SheetPeriod } from '@/services/printSheet';
import { useHabitStore } from '@/state/habitStore';
import { useT, type TranslationKey } from '@/i18n';

type Kind = 'report' | SheetKind;

/** The full calendar first, then the rest; the report of what was done is the other main choice. */
const KINDS: readonly Kind[] = ['calendarFull', 'report', ...SHEET_KINDS.filter((k) => k !== 'calendarFull')];

const FIELD_LABELS: Record<keyof CalendarFields, TranslationKey> = {
  sleep: 'print.field.sleep',
  mood: 'print.field.mood',
  gratitude: 'print.field.gratitude',
  did: 'print.field.did',
};

/** Print the month's report, or an empty sheet to fill in by hand: black and white, or in color. */
export function PrintScreen() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const today = useLocalDate();
  const params = useLocalSearchParams<{ habitId?: string; month?: string }>();
  const allHabits = useHabitStore((s) => s.habits);
  const habits = allHabits.filter((h) => !h.isArchived);
  const { canRead, ask } = useReflectionAccess();

  const [kind, setKind] = useState<Kind>('calendarFull');
  const [period, setPeriod] = useState<SheetPeriod>('next');
  const [color, setColor] = useState(false);
  const [withTasks, setWithTasks] = useState(true);
  const [withReflections, setWithReflections] = useState(false);
  const [fields, setFields] = useState<CalendarFields>({ sleep: true, mood: true, gratitude: true, did: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReport = kind === 'report';
  const weekly = kind === 'week' || kind === 'day';
  // A report looks back; a sheet looks forward. Pick a sensible default when the choice changes.
  const choose = (next: Kind) => {
    setKind(next);
    setPeriod(next === 'report' ? 'current' : 'next');
  };

  // The report is for the month the calendar was showing (this month when opened from elsewhere).
  const reportMonth = params.month && /^\d{4}-\d{2}-01$/.test(params.month) ? params.month : monthStart(today);
  const previousMonth = monthStart(addDays(reportMonth, -1));

  const periodLabel = (value: SheetPeriod): string => {
    if (isReport) return monthLabel(value === 'current' ? reportMonth : previousMonth, t.locale);
    return t(`print.period.${value}.${weekly ? 'week' : 'month'}` as TranslationKey);
  };

  const print = async () => {
    if (busy) return;
    setError(null);
    if (!isReport && habits.length === 0) {
      setError(t('print.noHabitsYet'));
      return;
    }
    setBusy(true);
    try {
      if (isReport) {
        // Reflections are private: ask for the fingerprint / PIN first when the lock is on.
        if (withReflections && !canRead && !(await ask())) return;
        const month = period === 'current' ? reportMonth : previousMonth;
        const data = await loadReportData(month);
        await printMonthReport({ month, today, ...data, habitId: params.habitId ?? null, includeTasks: withTasks, includeReflections: withReflections, color, t });
      } else {
        await printSheet({ kind, period, today, habits, color, fields, t });
      }
    } catch (e) {
      setError(t('print.error', { error: toErrorMessage(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t('print.screenTitle')} />
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

        <Card style={styles.card}>
          <Text style={typography.label}>{t('print.what')}</Text>
          <View style={styles.chips}>
            {KINDS.map((k) => (
              <Chip key={k} label={t(`print.kind.${k}` as TranslationKey)} selected={kind === k} onPress={() => choose(k)} />
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={typography.label}>{t('print.when')}</Text>
          <View style={styles.chips}>
            {(['current', 'next'] as const).map((value) => (
              <Chip key={value} label={periodLabel(value)} selected={period === value} onPress={() => setPeriod(value)} />
            ))}
          </View>
        </Card>

        {kind === 'calendarFull' ? (
          <Card style={styles.card}>
            <Text style={typography.label}>{t('print.inside')}</Text>
            <View style={styles.chips}>
              {(Object.keys(FIELD_LABELS) as (keyof CalendarFields)[]).map((key) => (
                <Chip key={key} label={t(FIELD_LABELS[key])} selected={fields[key]} onPress={() => setFields({ ...fields, [key]: !fields[key] })} />
              ))}
            </View>
          </Card>
        ) : null}

        {isReport ? (
          <Card style={styles.card}>
            <Text style={typography.label}>{t('print.include')}</Text>
            <View style={styles.chips}>
              <Chip label={t('print.withTasks')} selected={withTasks} onPress={() => setWithTasks(!withTasks)} />
              <Chip label={t('print.withReflections')} selected={withReflections} onPress={() => setWithReflections(!withReflections)} />
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={typography.label}>{t('print.colors')}</Text>
          <View style={styles.chips}>
            <Chip label={t('print.blackWhite')} selected={!color} onPress={() => setColor(false)} />
            <Chip label={t('print.colorful')} selected={color} onPress={() => setColor(true)} />
          </View>
        </Card>

        <Button label={t('print.button')} onPress={() => void print()} loading={busy} />
        <Text style={[typography.caption, styles.hint]}>{t('print.hint')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { textAlign: 'center' },
}));
