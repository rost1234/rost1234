import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/components/theme';
import { formatFriendlyDate, getWeekday, weekdayLabel, type LocalDateString } from '@/core/localDate';
import type { HeatCellState, HeatRow } from '@/domain/analytics';

const CELL_COLOR: Record<HeatCellState, string> = {
  completed: colors.success,
  partial: '#86D6A0',
  forgiven: colors.freeze,
  skipped: colors.border,
  missed: colors.dangerSoft,
  pending: colors.surfaceMuted,
  not_scheduled: 'transparent',
};

const LEGEND: { state: HeatCellState; label: string }[] = [
  { state: 'completed', label: 'Done' },
  { state: 'partial', label: 'Partial' },
  { state: 'forgiven', label: 'Freeze' },
  { state: 'missed', label: 'Missed' },
  { state: 'skipped', label: 'Skipped' },
];

const LABEL_WIDTH = 96;

function Cell({ state, size }: { state: HeatCellState; size: number }) {
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: CELL_COLOR[state] },
        state === 'not_scheduled' && styles.cellEmpty,
      ]}
    />
  );
}

export function Heatmap({ rows, dates }: { rows: readonly HeatRow[]; dates: readonly LocalDateString[] }) {
  const size = dates.length > 7 ? 14 : 30;
  const showDayLabels = dates.length <= 7;

  if (rows.length === 0) {
    return <Text style={typography.caption}>No habits yet.</Text>;
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
                  {weekdayLabel(getWeekday(date)).slice(0, 2)}
                </Text>
              ))}
            </View>
          ) : null}
          {rows.map((row) => (
            <View
              key={row.habitId}
              style={styles.row}
              accessible
              accessibilityLabel={`${row.title}: ${row.cells.filter((c) => c.state === 'completed').length} of ${
                row.cells.filter((c) => c.state !== 'not_scheduled').length
              } scheduled days completed`}
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
                {dates[0] ? `${formatFriendlyDate(dates[0])} → today` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.state} style={styles.legendItem}>
            <Cell state={item.state} size={12} />
            <Text style={typography.caption}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cell: { borderRadius: radius.sm / 2 },
  cellEmpty: { borderWidth: 1, borderColor: colors.surfaceMuted },
  dayLabel: { ...typography.caption, fontSize: 11, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
