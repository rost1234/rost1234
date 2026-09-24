import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, type IconName } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

const STEPS: readonly { icon: IconName; title: TranslationKey; body: TranslationKey }[] = [
  { icon: 'chatbubbles-outline', title: 'onboarding.1.title', body: 'onboarding.1.body' },
  { icon: 'help-circle-outline', title: 'onboarding.2.title', body: 'onboarding.2.body' },
  { icon: 'albums-outline', title: 'onboarding.3.title', body: 'onboarding.3.body' },
];

/** Three-step intro to the Feynman Technique and spaced repetition. */
export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        {!last ? <Button label={t('onboarding.skip')} variant="ghost" onPress={onFinish} /> : <View style={{ height: 48 }} />}
      </View>
      <View style={styles.body} accessibilityLiveRegion="polite">
        <View style={styles.iconWrap}>
          <Ionicons name={step.icon} size={56} color={colors.primary} />
        </View>
        <Text style={[typography.title, styles.center]} accessibilityRole="header">
          {t(step.title)}
        </Text>
        <Text style={[typography.body, styles.center, { color: colors.textMuted }]}>{t(step.body)}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && { backgroundColor: colors.primary, width: 22 }]} />
          ))}
        </View>
        <Button
          label={last ? t('onboarding.start') : t('onboarding.next')}
          onPress={() => (last ? onFinish() : setIndex(index + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  top: { alignItems: 'flex-end' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, maxWidth: 520, alignSelf: 'center' },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: { textAlign: 'center' },
  footer: { gap: spacing.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
}));
