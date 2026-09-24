import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { scoreColor, useTheme } from '@/theme';

/** Circular 0–100 gauge used for comprehension and mastery scores. */
export function ScoreRing({ score, size = 96, stroke = 9, caption }: { score: number; size?: number; stroke?: number; caption?: string }) {
  const { colors, typography } = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const color = scoreColor(clamped, colors);
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={caption}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </Svg>
      <Text style={[typography.heading, { fontSize: size * 0.28 }]}>{clamped}</Text>
      {caption && size >= 96 ? <Text style={[typography.caption, { fontSize: 11 }]}>{caption}</Text> : null}
    </View>
  );
}
