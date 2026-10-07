import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TutorTurn } from '@/local/types';
import { useT } from '@/i18n';
import { makeStyles, radius, scoreColor, spacing, useTheme } from '@/theme';
import { verdictForScore } from '../../../supabase/functions/_shared/feynman-tutor.ts';

const LONG = 260;

/** One message in the conversation with the tutor. */
export function ChatBubble({ turn, latest }: { turn: TutorTurn; latest: boolean }) {
  if (turn.role === 'learner') return <LearnerBubble turn={turn} />;
  if (turn.kind === 'clarification') return <ClarificationBubble turn={turn} />;
  return <FeedbackBubble turn={turn} latest={latest} />;
}

function LearnerBubble({ turn }: { turn: TutorTurn }) {
  const t = useT();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const long = turn.text.length > LONG;
  return (
    <View style={styles.learner}>
      {turn.kind === 'revision' ? <Text style={styles.learnerLabel}>{t('tutor.kind.revision')}</Text> : null}
      <Text style={styles.learnerText} selectable>
        {long && !open ? `${turn.text.slice(0, LONG).trimEnd()}…` : turn.text}
      </Text>
      {long ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} hitSlop={8}>
          <Text style={styles.learnerMore}>{open ? t('tutor.showLess') : t('tutor.showAll')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A thinking placeholder for the message being answered. */
export function PendingBubble({ text }: { text: string }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <>
      <View style={[styles.learner, { opacity: 0.75 }]}>
        <Text style={styles.learnerText}>{text.length > LONG ? `${text.slice(0, LONG)}…` : text}</Text>
      </View>
      <View style={styles.tutor}>
        <Who label={t('tutor.name')} />
        <Text style={typography.caption}>{t('tutor.thinking')}</Text>
      </View>
    </>
  );
}

function Who({ label, extra }: { label: string; extra?: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.who}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 14 }}>🎓</Text>
      </View>
      <Text style={styles.whoText}>{label}</Text>
      {extra}
    </View>
  );
}

const TAG = {
  answer_question: { icon: '✍️', key: 'tutor.tag.answer' },
  refine_explanation: { icon: '🎯', key: 'tutor.tag.refine' },
  done: { icon: '🌟', key: 'tutor.tag.done' },
} as const;

function FeedbackBubble({ turn, latest }: { turn: TutorTurn; latest: boolean }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [details, setDetails] = useState(false);
  const e = turn.evaluation!;
  const refine = e.next_step === 'refine_explanation';
  const tone = scoreColor(e.score, colors);
  const extras = e.misconceptions.length + e.jargon.length;
  return (
    <View style={[styles.tutor, refine && latest && { backgroundColor: colors.accentSoft, borderColor: colors.accent }, !latest && { opacity: 0.8 }]}>
      <Who
        label={t('tutor.name')}
        extra={
          <View style={[styles.score, { borderColor: tone }]}>
            <Text style={[styles.scoreText, { color: tone }]}>
              {e.score} · {t(`explain.verdict.${verdictForScore(e.score)}`)}
            </Text>
          </View>
        }
      />
      {turn.text ? (
        <Text style={typography.body} selectable>
          {turn.text}
        </Text>
      ) : null}
      {refine && e.refine_quote ? (
        <View style={styles.quote}>
          <Text style={typography.caption}>{t('tutor.fixThis')}</Text>
          <Text style={[typography.body, styles.mark]} selectable>
            “{e.refine_quote}”
          </Text>
        </View>
      ) : null}
      {e.question ? (
        <View style={styles.question}>
          <Text style={[typography.body, { fontWeight: '700' }]} selectable>
            ❓ {e.question}
          </Text>
        </View>
      ) : null}
      {latest ? (
        <Text style={[styles.tag, refine ? { color: colors.accent, backgroundColor: colors.surface } : { color: colors.primary, backgroundColor: colors.primarySoft }]}>
          {TAG[e.next_step].icon} {t(TAG[e.next_step].key)}
        </Text>
      ) : null}
      {extras ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails((d) => !d)} hitSlop={6} style={styles.detailsLink}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {details ? t('tutor.hideDetails') : t.plural('tutor.details', extras)}
          </Text>
          <Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </Pressable>
      ) : null}
      {details ? (
        <View style={{ gap: spacing.sm }}>
          {e.misconceptions.map((m, i) => (
            <View key={`m${i}`} style={styles.detail}>
              <Text style={[typography.body, { fontStyle: 'italic' }]}>“{m.user_quote}”</Text>
              <Text style={[typography.caption, { color: colors.danger }]}>{m.issue_area}</Text>
            </View>
          ))}
          {e.jargon.map((j, i) => (
            <View key={`j${i}`} style={styles.detail}>
              <Text style={[typography.body, { fontWeight: '700' }]}>{j.term}</Text>
              <Text style={typography.caption}>{j.plain_language_hint || j.why_problematic}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ClarificationBubble({ turn }: { turn: TutorTurn }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <View style={styles.tutor}>
      <Who label={`${t('tutor.name')} · ${t('tutor.clarification')}`} />
      <Text style={typography.body} selectable>
        {turn.text}
      </Text>
      <Text style={typography.caption}>💡 {t('tutor.hintNotAnswer')}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  learner: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomStartRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  learnerLabel: { color: colors.onPrimary, opacity: 0.8, fontSize: Math.round(12 * textScale), fontWeight: '800' },
  learnerText: { color: colors.onPrimary, fontSize: Math.round(16 * textScale), lineHeight: Math.round(24 * textScale) },
  learnerMore: { color: colors.onPrimary, opacity: 0.85, fontSize: Math.round(13 * textScale), fontWeight: '800' },
  tutor: {
    alignSelf: 'flex-end',
    width: '94%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderBottomEndRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  whoText: { color: colors.primary, fontWeight: '800', fontSize: Math.round(14 * textScale) },
  score: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  scoreText: { fontWeight: '800', fontSize: Math.round(13 * textScale) },
  quote: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, gap: 2, borderWidth: 1, borderColor: colors.border },
  mark: { backgroundColor: colors.accentSoft },
  question: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  tag: { alignSelf: 'flex-start', fontWeight: '800', fontSize: Math.round(13 * textScale), borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3, overflow: 'hidden' },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  detail: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
}));
