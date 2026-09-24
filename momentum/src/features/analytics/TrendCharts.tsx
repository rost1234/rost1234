import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors, spacing, typography } from '@/components/theme';
import { formatFriendlyDate } from '@/core/localDate';
import type { TrendPoint } from '@/domain/analytics';
import { MOOD_OPTIONS } from '@/features/reflection/mood';

const CHART_HEIGHT = 90;
const PAD = 6;

/**
 * Mood vs. habit completion as two aligned small multiples sharing one date
 * axis (never a dual-axis chart). Tap a day to inspect both values.
 */
export function TrendCharts({ points }: { points: readonly TrendPoint[] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = points.length;
  const step = n > 0 && width > 0 ? width / n : 0;
  const xAt = (i: number) => step * i + step / 2;
  const moodY = (mood: number) => PAD + (1 - (mood - 1) / 4) * (CHART_HEIGHT - PAD * 2);
  const barWidth = Math.max(2, Math.min(18, step - 2));

  const moodPoints = points
    .map((p, i) => (p.mood === null ? null : `${xAt(i)},${moodY(p.mood)}`))
    .filter((p): p is string => p !== null);

  const active = selected !== null ? points[selected] : undefined;
  const activeMood = active?.mood ? MOOD_OPTIONS.find((m) => m.score === active.mood) : undefined;

  const selectAt = (x: number) => {
    if (step <= 0) return;
    setSelected(Math.max(0, Math.min(n - 1, Math.floor(x / step))));
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.readout} accessibilityLiveRegion="polite">
        {active
          ? `${formatFriendlyDate(active.date)} · Mood ${activeMood ? `${activeMood.emoji} ${activeMood.label}` : '—'} · Habits ${
              active.completionPercent === null ? '—' : `${active.completionPercent}%`
            }`
          : 'Tap a day to compare mood and habits'}
      </Text>

      <Pressable onLayout={onLayout} onPress={(e) => selectAt(e.nativeEvent.locationX)} accessibilityLabel="Mood and completion trend">
        <Text style={typography.label}>Mood (1–5)</Text>
        <Svg width={width} height={CHART_HEIGHT}>
          {[1, 3, 5].map((m) => (
            <Line key={m} x1={0} x2={width} y1={moodY(m)} y2={moodY(m)} stroke={colors.surfaceMuted} strokeWidth={1} />
          ))}
          {selected !== null ? (
            <Line x1={xAt(selected)} x2={xAt(selected)} y1={0} y2={CHART_HEIGHT} stroke={colors.border} strokeWidth={1} />
          ) : null}
          {moodPoints.length > 1 ? (
            <Polyline points={moodPoints.join(' ')} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" />
          ) : null}
          {points.map((p, i) =>
            p.mood === null ? null : (
              <Circle key={p.date} cx={xAt(i)} cy={moodY(p.mood)} r={i === selected ? 5 : 3.5} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
            ),
          )}
        </Svg>

        <Text style={[typography.label, { marginTop: spacing.md }]}>Habits completed (%)</Text>
        <Svg width={width} height={CHART_HEIGHT}>
          <Line x1={0} x2={width} y1={CHART_HEIGHT - 0.5} y2={CHART_HEIGHT - 0.5} stroke={colors.border} strokeWidth={1} />
          {points.map((p, i) => {
            if (p.completionPercent === null) return null;
            const h = Math.max(2, (p.completionPercent / 100) * (CHART_HEIGHT - PAD));
            return (
              <Rect
                key={p.date}
                x={xAt(i) - barWidth / 2}
                y={CHART_HEIGHT - h}
                width={barWidth}
                height={h}
                rx={Math.min(4, barWidth / 2)}
                fill={colors.success}
                opacity={selected === null || selected === i ? 1 : 0.45}
              />
            );
          })}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { ...typography.caption, minHeight: 18 },
});
