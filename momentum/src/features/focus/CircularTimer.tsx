import { StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { ProgressRing } from '@/components/ProgressRing';
import { focusColors, useTheme } from '@/components/theme';
import { formatClock } from '@/domain/focusTimer';
import { focusStage } from '@/domain/garden';
import { Sprout } from '@/features/garden/Sprout';
import { useT } from '@/i18n';

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
  const t = useT();
  const { look } = useTheme();
  const clock = formatClock(remainingSeconds);
  // Garden: a small plant grows inside the ring, from a sprout at the start to a flower at the end.
  const garden = look === 'garden';
  return (
    <ProgressRing
      value={progress}
      size={size}
      stroke={12}
      track={focusColors.ringTrack}
      from={isPaused ? focusColors.paused : isBreak ? '#34D399' : focusColors.ringStart}
      to={isPaused ? '#F59E0B' : isBreak ? '#A7F3D0' : focusColors.ringEnd}
    >
      {garden ? <Sprout stage={focusStage(progress)} mood={isPaused ? 'sleepy' : isBreak ? 'happy' : 'calm'} size={Math.round(size * 0.42)} /> : null}
      <Text
        style={[styles.clock, { color: focusColors.text }, { fontSize: garden ? (size > 240 ? 44 : 36) : size > 240 ? 60 : 50 }]}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="timer"
        accessibilityLabel={`${clock} ${isPaused ? t('timer.paused') : t('timer.remaining')}`}
      >
        {clock}
      </Text>
      <Text style={styles.caption}>{caption ?? (isPaused ? t('timer.paused') : t('timer.remaining'))}</Text>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  clock: { fontWeight: '200', color: focusColors.text, fontVariant: ['tabular-nums'], letterSpacing: 1 },
  caption: { color: focusColors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
});
