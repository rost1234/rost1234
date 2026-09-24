import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/components/theme';
import { runDetached } from '@/core/errors';

const KEY = 'momentum.coach.v1';

const TIPS = [
  { icon: 'hand-left-outline', text: 'Tap a habit to check it off — or +1 for counted habits.' },
  { icon: 'ellipsis-horizontal-circle-outline', text: 'Long-press a habit to skip, edit or archive it.' },
  { icon: 'swap-horizontal-outline', text: 'Swipe left or right to move between Today, Focus, Insights and Settings.' },
] as const;

/** Three one-time tips on first use. Remembered per device. */
export function CoachMarks() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((done) => setStep(done ? null : 0))
      .catch(() => setStep(null));
  }, []);

  if (step === null) return null;
  const tip = TIPS[step];
  if (!tip) return null;

  const finish = () => {
    setStep(null);
    runDetached(AsyncStorage.setItem(KEY, '1'));
  };
  const next = () => (step + 1 < TIPS.length ? setStep(step + 1) : finish());

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Ionicons name={tip.icon} size={22} color={colors.primary} />
      <Text style={[typography.body, { flex: 1 }]}>{tip.text}</Text>
      <View style={styles.actions}>
        <Text style={typography.caption}>
          {step + 1}/{TIPS.length}
        </Text>
        <Pressable accessibilityRole="button" onPress={next} hitSlop={8}>
          <Text style={styles.next}>{step + 1 < TIPS.length ? 'Next' : 'Got it'}</Text>
        </Pressable>
        {step + 1 < TIPS.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skip tips" onPress={finish} hitSlop={8}>
            <Text style={typography.caption}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  actions: { alignItems: 'flex-end', gap: spacing.xs },
  next: { ...typography.label, color: colors.primary },
});
