import { ScrollView, Text, View } from 'react-native';
import { makeStyles, radius, spacing, useTheme, type Theme } from '@/components/theme';
import { formatFriendlyDate, getWeekday, weekdayLabel, type LocalDateString } from '@/core/localDate';
import type { HeatCellState, HeatRow } from '@/domain/analytics';
import type { TranslationKey } from '@/i18n';
import { useT } from '@/i18n';

function cellColor(state: HeatCellState, colors: Theme['colors']): string {
  switch (state) {
    case 'completed':
      return colors.success;
    case 'partial':
      return colors.partial;
    case 'forgiven':
      return colors.freeze;
    case 'skipped':
      return colors.border;
    case 'missed':
      return colors.dangerSoft;
    case 'pending':
      return colors.surfaceMuted;
    case 'not_scheduled':
      return 'transparent';
  }
}

/** Every state also has a symbol, so meaning never depends on color alone. */
const CELL_SYMBOL: Record<HeatCellState, string> = {
  completed: '✓',
  partial: '◐',
  forgiven: '❄',
  missed: '·',
  skipped: '–',
  pending: '',
  not_scheduled: '',
};

function cellInk(state: HeatCellState, colors: Theme['colors']): string {
  switch (state) {
    case 'completed':
    case 'forgiven':
      return '#FFFFFF';
    case 'partial':
      return colors.text;
    case 'missed':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

const LEGEND: { state: HeatCellState; label: TranslationKey }[] = [
  { state: 'completed', label: 'heat.done' },
  { state: 'partial', label: 'heat.partial' },
  { state: 'forgiven', label: 'heat.freeze' },
  { state: 'missed', label: 'heat.missed' },
  { state: 'skipped', label: 'heat.skipped' },
];

const LABEL_WIDTH = 96;

function Cell({ state, size }: { state: HeatCellState; size: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const symbol = CELL_SYMBOL[state];
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: cellColor(state, colors) },
        state === 'not_scheduled' && styles.cellEmpty,
      ]}
    >
      {symbol && size >= 12 ? (
        <Text
          style={[styles.symbol, { fontSize: Math.round(size * 0.6), lineHeight: size, color: cellInk(state, colors) }]}
          allowFontScaling={false}
        >
          {symbol}
        </Text>
      ) : null}
    </View>
  );
}

export function Heatmap({ rows, dates }: { rows: readonly HeatRow[]; dates: readonly LocalDateString[] }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const size = dates.length > 7 ? 14 : 30;
  const showDayLabels = dates.length <= 7;

  if (rows.length === 0) {
    return <Text style={typography.caption}>{t('heat.noHabits')}</Text>;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          {showDayLabels ? (
            <View style={styles.row}>
              <View style={{ width: LABEL_WIDTH }} />
              {dates.map((date) => (
                <Text key={date} style={[styles.dayLabel, { width: size }]}>
                  {weekdayLabel(getWeekday(date), t.locale).slice(0, 3)}
                </Text>
              ))}
            </View>
          ) : null}
          {rows.map((row) => (
            <View
              key={row.habitId}
              style={styles.row}
              accessible
              accessibilityLabel={t('heat.rowA11y', {
                title: row.title,
                done: row.cells.filter((c) => c.state === 'completed').length,
                scheduled: row.cells.filter((c) => c.state !== 'not_scheduled').length,
              })}
            >
              <Text style={[typography.caption, { width: LABEL_WIDTH }]} numberOfLines={1}>
                {row.title}
              </Text>
              {row.cells.map((cell) => (
                <Cell key={cell.date} state={cell.state} size={size} />
              ))}
            </View>
          ))}
          {!showDayLabels ? (
            <View style={styles.row}>
              <View style={{ width: LABEL_WIDTH }} />
              <Text style={typography.caption}>
                {dates[0] ? t('heat.toToday', { date: formatFriendlyDate(dates[0], t.locale) }) : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.state} style={styles.legendItem}>
            <Cell state={item.state} size={12} />
            <Text style={typography.caption}>{t(item.label)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cell: { borderRadius: radius.sm / 2, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontWeight: '800', textAlign: 'center' },
  cellEmpty: { borderWidth: 1, borderColor: colors.surfaceMuted },
  dayLabel: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
}));
