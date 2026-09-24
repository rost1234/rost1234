import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import type { TranslationKey } from '@/i18n';
import { useT } from '@/i18n';

const KEY = 'momentum.coach.v1';

const TIPS = [
  { icon: 'hand-left-outline', text: 'coach.tap' },
  { icon: 'ellipsis-horizontal-circle-outline', text: 'coach.longPress' },
  { icon: 'swap-horizontal-outline', text: 'coach.swipe' },
] as const satisfies readonly { icon: string; text: TranslationKey }[];

/** Three one-time tips on first use. Remembered per device. */
export function CoachMarks() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
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
      <Text style={[typography.body, { flex: 1 }]}>{t(tip.text)}</Text>
      <View style={styles.actions}>
        <Text style={typography.caption}>
          {step + 1}/{TIPS.length}
        </Text>
        <Pressable accessibilityRole="button" onPress={next} hitSlop={8}>
          <Text style={styles.next}>{step + 1 < TIPS.length ? t('common.next') : t('common.gotIt')}</Text>
        </Pressable>
        {step + 1 < TIPS.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('coach.skipA11y')} onPress={finish} hitSlop={8}>
            <Text style={typography.caption}>{t('common.skip')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
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
}));
