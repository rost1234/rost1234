import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '@/components/theme';
import { formatClock } from '@/domain/focusTimer';

interface CircularTimerProps {
  remainingSeconds: number;
  progress: number;
  isPaused: boolean;
  size?: number;
  strokeWidth?: number;
}

export function CircularTimer({ remainingSeconds, progress, isPaused, size = 260, strokeWidth = 14 }: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const clock = formatClock(remainingSeconds);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="timer"
      accessibilityLabel={`${clock} remaining${isPaused ? ', paused' : ''}`}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceMuted} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isPaused ? colors.warning : colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * clamped}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.clock}>{clock}</Text>
        <Text style={typography.caption}>{isPaused ? 'Paused' : 'Remaining'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clock: { fontSize: 56, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
});
