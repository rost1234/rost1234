import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendarMonth, type CalendarDay } from '@/data/study';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Hex color with an alpha channel (colors in the theme are #RRGGBB). */
const alpha = (hex: string, a: number) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

/**
 * A month grid: days you reviewed are green (darker = more cards), coming
 * days show how many cards fall due, today is outlined. Tap a day for details.
 */
export function ReviewCalendar() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const month = useCalendarMonth(view.year, view.month);

  const shift = (delta: number) => {
    setSelected(null);
    setView(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const days = month.data ?? [];
  const firstWeekday = new Date(view.year, view.month, 1).getDay(); // 0 = Sunday
  const cells: (CalendarDay | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const weekdayNames = Array.from({ length: 7 }, (_, i) => new Date(2026, 1, 1 + i).toLocaleDateString(t.locale, { weekday: 'narrow' }));
  const detail = days.find((d) => d.date === selected) ?? days.find((d) => d.isToday) ?? null;

  const cellStyle = (d: CalendarDay) => {
    if (d.reviewed > 0) {
      const level = d.reviewed >= 25 ? 1 : d.reviewed >= 10 ? 0.6 : 0.3;
      return { backgroundColor: alpha(colors.success, level) };
    }
    if (!d.isPast && d.due > 0) return { backgroundColor: colors.primarySoft };
    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('calendar.prev')} hitSlop={10} onPress={() => shift(-1)}>
          <Ionicons name={t.isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.primary} />
        </Pressable>
        <Text style={[typography.subheading, styles.month]} accessibilityRole="header">
          {new Date(view.year, view.month, 1).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('calendar.next')} hitSlop={10} onPress={() => shift(1)}>
          <Ionicons name={t.isRTL ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {weekdayNames.map((name, i) => (
          <Text key={i} style={[typography.caption, styles.weekday]}>
            {name}
          </Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((d, i) =>
            d ? (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityLabel={dayLabel(d, t)}
                onPress={() => setSelected(d.date)}
                style={[styles.cell, cellStyle(d), d.isToday && { borderColor: colors.primary, borderWidth: 2 }, d.date === selected && !d.isToday && { borderColor: colors.text, borderWidth: 1 }]}
              >
                <Text style={[styles.dayNum, { color: d.reviewed >= 25 ? colors.onPrimary : colors.text }, d.isToday && { fontWeight: '800' }]}>
                  {Number(d.date.slice(8))}
                </Text>
                {!d.isPast && d.due > 0 ? <Text style={[styles.due, { color: colors.primary }]}>{d.due}</Text> : null}
              </Pressable>
            ) : (
              <View key={`e${i}`} style={styles.cell} />
            ),
          )}
        </View>
      ))}

      <View style={styles.legend}>
        <Legend color={alpha(colors.success, 0.6)} label={t('calendar.legendReviewed')} />
        <Legend color={colors.primarySoft} label={t('calendar.legendDue')} />
        <Legend color="transparent" border={colors.primary} label={t('calendar.legendToday')} />
      </View>

      {detail ? (
        <View style={styles.detail}>
          <Text style={typography.body}>{dayLabel(detail, t)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function dayLabel(d: CalendarDay, t: ReturnType<typeof useT>): string {
  const date = new Date(`${d.date}T12:00:00`).toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  if (d.isToday) return t('calendar.today', { date, reviewed: d.reviewed, due: d.due });
  if (d.isPast) return d.reviewed ? t('calendar.past', { date, reviewed: d.reviewed, correct: d.correct }) : t('calendar.pastNone', { date });
  return d.due ? t('calendar.future', { date, due: d.due }) : t('calendar.futureNone', { date });
}

function Legend({ color, label, border }: { color: string; label: string; border?: string }) {
  const { typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color, borderWidth: border ? 2 : 0, borderColor: border }} />
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  month: { flex: 1, textAlign: 'center', fontWeight: '800' },
  week: { flexDirection: 'row', gap: 5 },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '700' },
  cell: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayNum: { fontSize: 14 },
  due: { fontSize: 10, fontWeight: '800', lineHeight: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  detail: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
}));
