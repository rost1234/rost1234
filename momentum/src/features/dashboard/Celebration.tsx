import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { heroGradient, radius, spacing } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { formatFriendlyDate } from '@/core/localDate';
import { unlock } from '@/services/appLock';
import { useDevicePrefsStore } from '@/state/devicePrefsStore';
import { useT } from '@/i18n';
import { useCelebrationStore } from '@/state/habitEffects';

const EMOJI: Record<number, string> = { 7: '🔥', 30: '🌟', 100: '🏆', 365: '👑' };

/** A short, quiet celebration for streak milestones — no points, no badges. */
export function Celebration() {
  const t = useT();
  const celebration = useCelebrationStore((s) => s.celebration);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));
  const locked = useDevicePrefsStore((s) => s.lockReflections);
  // The day-one note starts closed: someone else may be looking at the screen.
  const [noteOpenFor, setNoteOpenFor] = useState<number | null>(null);
  const noteOpen = celebration !== null && noteOpenFor === celebration.at;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!celebration) return;
    haptics.success();
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    // With a note to open, stay a little longer.
    timeout.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => dismiss());
    }, celebration.dayOneNote ? 6000 : 2800);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [celebration, dismiss, opacity, scale]);

  const openNote = () =>
    runDetached(
      (async () => {
        // Stop the fade first, so a slow unlock doesn't lose the note. Open notes stay until closed.
        if (timeout.current) clearTimeout(timeout.current);
        if (locked && !(await unlock())) return;
        if (celebration) setNoteOpenFor(celebration.at);
      })(),
    );

  if (!celebration) return null;
  return (
    <Animated.View style={[styles.backdrop, { opacity }]} accessibilityLiveRegion="assertive">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('common.done')} />
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>{celebration.kind === 'firstWin' ? '🌱' : (EMOJI[celebration.days] ?? '🎉')}</Text>
        <Text style={styles.title}>{celebration.kind === 'firstWin' ? t('firstWin.done') : t('milestone.title', { days: celebration.days })}</Text>
        <Text style={styles.body}>
          {celebration.kind === 'firstWin' ? t('firstWin.doneBody', { title: celebration.habitTitle }) : t('milestone.body', { title: celebration.habitTitle })}
        </Text>
        {celebration.kind !== 'firstWin' && celebration.choices > 1 ? (
          <Text style={styles.path}>{t('path.choices', { count: celebration.choices })}</Text>
        ) : null}
        {celebration.dayOneNote ? (
          noteOpen ? (
            <Text style={styles.note}>
              {formatFriendlyDate(celebration.dayOneNote.date, t.locale)}: “{celebration.dayOneNote.text}”
            </Text>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={t('milestone.dayOneNote')} onPress={openNote} hitSlop={8} style={styles.noteButton}>
              <Text style={styles.noteButtonText}>📝 {t('milestone.dayOneNote')} {t.isRTL ? '◂' : '▸'}</Text>
            </Pressable>
          )
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,30,0.45)' },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: heroGradient[0],
    maxWidth: '85%',
  },
  emoji: { fontSize: 64 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.9)', fontSize: 15, textAlign: 'center' },
  path: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },
  noteButton: { marginTop: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  noteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  note: { color: '#FFFFFF', fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xs },
});
