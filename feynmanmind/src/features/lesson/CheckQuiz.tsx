import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SketchBorder, SketchCheck, SketchCircle } from '@/components/sketch';
import { Text } from '@/components/Text';
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
  const { colors, typography, look } = useTheme();
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
            {look === 'chalk' ? <SketchBorder color="rgba(238,240,232,0.75)" seed={i * 29 + 5} radius={14} /> : null}
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
                    look === 'classic' && reveal && isRight && { borderColor: colors.success, backgroundColor: colors.successSoft },
                    look === 'classic' && reveal && isPicked && !isRight && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
                  ]}
                >
                  {look === 'classic' ? null : (
                    <>
                      {/* A test on paper: the right answer gets circled by hand, a wrong pick is crossed out. */}
                      {reveal && isRight ? <SketchBorder color={colors.success} seed={i * 7 + j + 1} radius={22} width={look === 'chalk' ? 2.6 : 2} /> : null}
                      <View style={styles.bullet}>
                        <SketchCircle size={22} color={isPicked ? colors.ink : colors.textMuted} fill={isPicked ? colors.ink : undefined} seed={j * 13 + i + 2} width={1.6} />
                      </View>
                    </>
                  )}
                  <Text style={[typography.body, { flex: 1 }, look !== 'classic' && reveal && isPicked && !isRight && styles.wrong]}>{option}</Text>
                  {reveal ? (
                    look === 'classic' ? (
                      <Ionicons name={isRight ? 'checkmark-circle' : 'close-circle'} size={20} color={isRight ? colors.success : colors.danger} />
                    ) : isRight ? (
                      <SketchCheck size={22} color={colors.success} />
                    ) : null
                  ) : null}
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

const useStyles = makeStyles(({ colors, look }) => ({
  card:
    look === 'paper'
      ? { backgroundColor: colors.surface, borderRadius: 3, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm, boxShadow: '0px 1px 0px #CDB68A' }
      : look === 'chalk'
        ? { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 14, padding: spacing.lg, gap: spacing.sm }
        : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  bullet: { width: 22, height: 22 },
  wrong: { color: colors.danger, textDecorationLine: 'line-through', textDecorationColor: colors.danger },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: look === 'classic' ? 1.5 : 0,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  summary: { borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
}));
