import { StyleSheet, Text } from 'react-native';
import { ProgressRing } from '@/components/ProgressRing';
import { focusColors } from '@/components/theme';
import { formatClock } from '@/domain/focusTimer';

interface CircularTimerProps {
  remainingSeconds: number;
  progress: number;
  isPaused: boolean;
  caption?: string;
  size?: number;
  /** Pomodoro breaks use a calm green ring. */
  isBreak?: boolean;
}

export function CircularTimer({ remainingSeconds, progress, isPaused, caption, size = 270, isBreak = false }: CircularTimerProps) {
  const clock = formatClock(remainingSeconds);
  return (
    <ProgressRing
      value={progress}
      size={size}
      stroke={12}
      track={focusColors.ringTrack}
      from={isPaused ? focusColors.paused : isBreak ? '#34D399' : focusColors.ringStart}
      to={isPaused ? '#F59E0B' : isBreak ? '#A7F3D0' : focusColors.ringEnd}
    >
      <Text
        style={[styles.clock, { fontSize: size > 240 ? 60 : 50 }]}
        accessibilityRole="timer"
        accessibilityLabel={`${clock} ${isPaused ? 'paused' : 'remaining'}`}
      >
        {clock}
      </Text>
      <Text style={styles.caption}>{caption ?? (isPaused ? 'Paused' : 'Remaining')}</Text>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  clock: { fontWeight: '200', color: focusColors.text, fontVariant: ['tabular-nums'], letterSpacing: 1 },
  caption: { color: focusColors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
});
