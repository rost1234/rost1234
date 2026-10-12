import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/AppText';
import Svg, { Circle, G, Line, Polyline, Rect } from 'react-native-svg';
import { makeStyles, spacing, useTheme } from '@/components/theme';
import { formatFriendlyDate } from '@/core/localDate';
import type { TrendPoint } from '@/domain/analytics';
import { MOOD_OPTIONS } from '@/features/reflection/mood';
import { useT } from '@/i18n';

const CHART_HEIGHT = 90;
const PAD = 6;

/**
 * Mood vs. habit completion as two aligned small multiples sharing one date
 * axis (never a dual-axis chart). Tap a day to inspect both values.
 */
export function TrendCharts({ points }: { points: readonly TrendPoint[] }) {
  const t = useT();
  const { colors, typography, look, scenery } = useTheme();
  const styles = useStyles();
  // Garden: each day is a stem; a full day ends in a flower, a partial one in a bud.
  const garden = look === 'garden';
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
          ? t('trend.readout', {
              date: formatFriendlyDate(active.date, t.locale),
              mood: activeMood ? `${activeMood.emoji} ${t(activeMood.label)}` : '—',
              habits: active.completionPercent === null ? '—' : `${active.completionPercent}%`,
            })
          : t('trend.tapHint')}
      </Text>

      <Pressable onLayout={onLayout} onPress={(e) => selectAt(e.nativeEvent.locationX)} accessibilityLabel={t('trend.a11y')}>
        <Text style={typography.label}>{t('trend.mood')}</Text>
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

        <Text style={[typography.label, { marginTop: spacing.md }]}>{t('trend.habits')}</Text>
        <Svg width={width} height={CHART_HEIGHT}>
          <Line x1={0} x2={width} y1={CHART_HEIGHT - 0.5} y2={CHART_HEIGHT - 0.5} stroke={colors.border} strokeWidth={1} />
          {points.map((p, i) => {
            if (p.completionPercent === null) return null;
            const h = Math.max(2, (p.completionPercent / 100) * (CHART_HEIGHT - PAD));
            if (garden) {
              const dim = selected === null || selected === i ? 1 : 0.45;
              const head = Math.max(3, Math.min(7, barWidth / 2 + 2));
              const top = Math.max(head + 1, CHART_HEIGHT - h);
              if (p.completionPercent === 0) return <Circle key={p.date} cx={xAt(i)} cy={CHART_HEIGHT - 3} r={2.5} fill={colors.textMuted} opacity={dim} />;
              return (
                <G key={p.date} opacity={dim}>
                  <Rect x={xAt(i) - Math.max(1.5, barWidth / 5)} y={top} width={Math.max(3, (barWidth * 2) / 5)} height={CHART_HEIGHT - top} rx={1.5} fill={colors.success} />
                  {p.completionPercent >= 100 ? (
                    <>
                      <Circle cx={xAt(i)} cy={top} r={head} fill={scenery.sun} />
                      <Circle cx={xAt(i)} cy={top} r={head * 0.45} fill={scenery.coral} />
                    </>
                  ) : (
                    <Circle cx={xAt(i)} cy={top} r={head * 0.6} fill={scenery.coral} />
                  )}
                </G>
              );
            }
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
        {garden ? <Text style={[typography.caption, { marginTop: spacing.xs }]}>{t('garden.chartKey')}</Text> : null}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ typography }) => ({
  readout: { ...typography.caption, minHeight: 18 },
}));
