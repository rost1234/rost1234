import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { formatFriendlyDate, type LocalDateString } from '@/core/localDate';
import { useT } from '@/i18n';
import { useHomePromptSlot } from '@/features/dashboard/homePrompts';
import { dueLetters, useLettersStore } from './lettersStore';

/** On the day a letter to your future self opens: one envelope on Home until it's read. */
export function LetterDueCard({ today }: { today: LocalDateString }) {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const letters = useLettersStore((s) => s.letters);
  const load = useLettersStore((s) => s.load);

  useEffect(() => {
    runDetached(load());
  }, [load, today]);

  const due = letters ? dueLetters(letters, today)[0] : undefined;
  const isMine = useHomePromptSlot('letter', due !== undefined);
  if (!due || !isMine) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('letter.dueA11y', { date: formatFriendlyDate(due.writtenOn, t.locale) })}
      onPress={() => router.push('/letters')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.emoji} importantForAccessibility="no">
        📬
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{t('letter.dueTitle')}</Text>
        <Text style={typography.caption}>{t('letter.dueBody', { date: formatFriendlyDate(due.writtenOn, t.locale) })}</Text>
      </View>
      <Text style={styles.chevron}>{t.isRTL ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  emoji: { fontSize: 26 },
  chevron: { fontSize: 28, color: colors.textMuted },
}));
