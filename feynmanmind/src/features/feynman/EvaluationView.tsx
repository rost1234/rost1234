import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { FeynmanEvaluation } from '@/api/functions';
import { ScoreRing } from '@/components/ScoreRing';
import { Card, Chip, SectionHeader } from '@/components/ui';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { verdictForScore } from '../../../supabase/functions/_shared/feynman-tutor.ts';

export interface EvaluationData {
  comprehension_score: number;
  socratic_question: string | null;
  jargon_detected: FeynmanEvaluation['jargon_detected'];
  misconceptions: FeynmanEvaluation['misconceptions'];
  primary_gap?: string;
  encouragement?: string;
}

const VERDICT_TONE = { needs_work: 'danger', developing: 'warning', solid: 'success', mastered: 'success' } as const;

/** Tutor feedback: score, the Socratic question, jargon and misconceptions. */
export function EvaluationView({ data }: { data: EvaluationData }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const verdict = verdictForScore(data.comprehension_score);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={styles.scoreCard}>
        <ScoreRing score={data.comprehension_score} caption={t('explain.score')} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Chip label={t(`explain.verdict.${verdict}`)} tone={VERDICT_TONE[verdict]} />
          {data.encouragement ? <Text style={typography.body}>{data.encouragement}</Text> : null}
        </View>
      </Card>

      {data.socratic_question ? (
        <View style={styles.question} accessibilityRole="summary">
          <View style={styles.questionHead}>
            <Ionicons name="help-circle" size={20} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>{t('explain.question').toLocaleUpperCase()}</Text>
          </View>
          <Text style={[typography.heading, { fontWeight: '600', lineHeight: 28 }]}>{data.socratic_question}</Text>
          {data.primary_gap ? (
            <Text style={typography.caption}>
              {t('explain.gap')}: {data.primary_gap}
            </Text>
          ) : null}
        </View>
      ) : null}

      {data.misconceptions.length > 0 ? (
        <>
          <SectionHeader title={t('explain.misconceptions')} />
          {data.misconceptions.map((m, i) => (
            <Card key={`m${i}`} style={{ borderColor: colors.danger }}>
              <Text style={typography.caption}>{t('explain.youSaid')}</Text>
              <Text style={[typography.body, { fontStyle: 'italic' }]}>“{m.user_quote}”</Text>
              <Text style={[typography.caption, { color: colors.danger }]}>
                {t('explain.rethink')}: {m.issue_area}
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      {data.jargon_detected.length > 0 ? (
        <>
          <SectionHeader title={t('explain.jargon')} />
          {data.jargon_detected.map((j, i) => (
            <Card key={`j${i}`}>
              <Chip label={j.term} tone="warning" />
              {j.why_problematic ? <Text style={typography.body}>{j.why_problematic}</Text> : null}
              {j.plain_language_hint ? (
                <View style={styles.hint}>
                  <Ionicons name="bulb-outline" size={16} color={colors.accent} />
                  <Text style={[typography.caption, { flex: 1 }]}>{j.plain_language_hint}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  question: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  questionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hint: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
}));
