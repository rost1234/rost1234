import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { heroGradient, radius, spacing } from '@/components/theme';
import { haptics } from '@/core/haptics';
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

  useEffect(() => {
    if (!celebration) return;
    haptics.success();
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => dismiss());
    }, 2800);
    return () => clearTimeout(timeout);
  }, [celebration, dismiss, opacity, scale]);

  if (!celebration) return null;
  return (
    <Animated.View style={[styles.backdrop, { opacity }]} accessibilityLiveRegion="assertive">
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('common.done')} />
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>{EMOJI[celebration.days] ?? '🎉'}</Text>
        <Text style={styles.title}>{t('milestone.title', { days: celebration.days })}</Text>
        <Text style={styles.body}>{t('milestone.body', { title: celebration.habitTitle })}</Text>
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
});
