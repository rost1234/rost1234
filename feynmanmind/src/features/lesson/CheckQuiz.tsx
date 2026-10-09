import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CheckQuestion } from '@/content/lesson';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * "Check yourself": short multiple-choice questions right after reading. Tap
 * an option to see whether it's right and why; you can try again.
 */
export function CheckQuiz({ questions }: { questions: CheckQuestion[] }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === questions[i]!.correct).length;

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={typography.caption}>{t('lesson.checkIntro')}</Text>
      {questions.map((q, i) => {
        const choice = picked[i];
        return (
          <View key={i} style={styles.card}>
            <Text style={typography.subheading}>
              {i + 1}. {q.question}
            </Text>
            {q.options.map((option, j) => {
              const isPicked = choice === j;
              const isRight = j === q.correct;
              const reveal = choice !== null && (isPicked || isRight);
              return (
                <Pressable
                  key={j}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isPicked }}
                  onPress={() => {
                    if (isRight) haptics.success();
                    else haptics.tap();
                    setPicked((p) => p.map((v, k) => (k === i ? j : v)));
                  }}
                  style={[
                    styles.option,
                    reveal && isRight && { borderColor: colors.success, backgroundColor: colors.successSoft },
                    reveal && isPicked && !isRight && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
                  ]}
                >
                  <Text style={[typography.body, { flex: 1 }]}>{option}</Text>
                  {reveal ? <Ionicons name={isRight ? 'checkmark-circle' : 'close-circle'} size={20} color={isRight ? colors.success : colors.danger} /> : null}
                </Pressable>
              );
            })}
            {choice !== null ? (
              <Text style={[typography.body, { color: choice === q.correct ? colors.success : colors.text }]} accessibilityLiveRegion="polite">
                {choice === q.correct ? t('lesson.checkRight') : t('lesson.checkWrong')} {q.why}
              </Text>
            ) : null}
          </View>
        );
      })}
      {answered === questions.length ? (
        <View style={[styles.summary, { backgroundColor: right === questions.length ? colors.successSoft : colors.primarySoft }]}>
          <Text style={typography.subheading}>
            {right === questions.length ? '🌟 ' : ''}
            {t('lesson.checkScore', { right, total: questions.length })}
          </Text>
          <Text style={typography.caption}>{right === questions.length ? t('lesson.checkAllRight') : t('lesson.checkSome')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  summary: { borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
}));
