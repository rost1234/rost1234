import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import { LiveSprout } from '@/features/garden/LiveSprout';
import { Sprout } from '@/features/garden/Sprout';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useT } from '@/i18n';
import { usePrefsStore } from '@/state/prefsStore';

/** The very first screen: the sprout says hello (Garden look only). */
export function SproutHello() {
  const t = useT();
  const { look, colors } = useTheme();
  const styles = useStyles();
  if (look !== 'garden') return null;
  return (
    <View style={styles.hello}>
      <LiveSprout stage={1} mood="happy" size={96} cheerOnMount />
      <View style={[styles.bubble, { backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
        <Text style={styles.bubbleText}>{t('onb.hello')}</Text>
      </View>
    </View>
  );
}

/** Garden (with the talking sprout) or Calm: picked here, switchable any time in Settings. */
export function LookChoice() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const look = usePrefsStore((s) => s.look);
  const setLook = usePrefsStore((s) => s.setLook);
  const card = (id: 'garden' | 'calm', icon: string, title: string, hint: string) => {
    const selected = look === id;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${title}. ${hint}`}
        onPress={() => {
          haptics.select();
          setLook(id);
        }}
        style={({ pressed }) => [styles.lookCard, selected && styles.lookCardOn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.lookIcon}>{icon}</Text>
        <Text style={typography.label}>{title}</Text>
        <Text style={typography.caption}>{hint}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.lookWrap}>
      <Text style={typography.label}>{t('onb.lookTitle')}</Text>
      <View style={styles.lookRow} accessibilityRole="radiogroup">
        {card('garden', '🌱', t('onb.lookGarden'), t('onb.lookGardenHint'))}
        {card('calm', '🌿', t('onb.lookCalm'), t('onb.lookCalmHint'))}
      </View>
      <Text style={typography.caption}>{t('onb.lookLater')}</Text>
    </View>
  );
}

const HOLD_MS = 900;

/**
 * The end of setting up in the Garden look: hold the seed for a moment and it goes into the soil.
 * With a screen reader (or reduced motion) one activation plants it.
 */
export function PlantSeed({ onPlanted, disabled }: { onPlanted: () => void; disabled?: boolean }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const [sink] = useState(() => new Animated.Value(0));
  const [planted, setPlanted] = useState(false);
  const [hint, setHint] = useState(false);
  const reader = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      reader.current = on;
    }, () => undefined);
  }, []);

  const plant = () => {
    if (planted || disabled) return;
    setPlanted(true);
    haptics.success();
    AccessibilityInfo.announceForAccessibility(t('onb.planted'));
    sink.setValue(1);
    onPlanted();
  };

  return (
    <View style={styles.plantWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('onb.plant')}
        accessibilityHint={t('onb.plantHint')}
        accessibilityState={{ disabled: disabled || planted }}
        disabled={disabled || planted}
        delayLongPress={HOLD_MS}
        onPressIn={() => {
          if (reduce) return;
          haptics.tap();
          Animated.timing(sink, { toValue: 1, duration: HOLD_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          if (!planted) Animated.timing(sink, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }}
        onLongPress={plant}
        onPress={() => {
          // A screen reader's double tap, or reduced motion, plants right away; otherwise say to hold.
          if (reader.current || reduce) {
            plant();
            return;
          }
          AccessibilityInfo.isScreenReaderEnabled().then(
            (on) => (on ? plant() : setHint(true)),
            () => setHint(true),
          );
        }}
        style={[styles.plot, { backgroundColor: colors.surface }]}
      >
        {planted ? (
          <Sprout stage={0} mood="happy" size={120} />
        ) : (
          <View style={styles.soilBox}>
            <Animated.Text style={[styles.seed, { transform: [{ translateY: sink.interpolate({ inputRange: [0, 1], outputRange: [0, 46] }) }] }]}>🌰</Animated.Text>
            <View style={styles.soil} />
          </View>
        )}
      </Pressable>
      <Text style={[typography.label, styles.center]}>{planted ? t('onb.planted') : t('onb.plantCall')}</Text>
      {hint && !planted ? <Text style={[typography.caption, styles.center]}>{t('onb.plantHold')}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hello: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  bubble: { flex: 1, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  bubbleText: { fontSize: 17, lineHeight: 24, color: colors.text },
  lookWrap: { gap: spacing.sm, marginTop: spacing.md },
  lookRow: { flexDirection: 'row', gap: spacing.md },
  lookCard: {
    flex: 1,
    minHeight: 110,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  lookCardOn: { borderColor: colors.primary, borderWidth: 3 },
  lookIcon: { fontSize: 28 },
  plantWrap: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  plot: { width: 180, height: 160, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  soilBox: { width: 140, height: 120, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  seed: { fontSize: 40, position: 'absolute', top: 10 },
  soil: { width: 140, height: 46, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: '#7A4E33' },
  center: { textAlign: 'center' },
}));
