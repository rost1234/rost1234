import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TutorTurn } from '@/local/types';
import { useT } from '@/i18n';
import { makeStyles, radius, scoreColor, spacing, useTheme } from '@/theme';
import { verdictForScore } from '../../../supabase/functions/_shared/feynman-tutor.ts';

const LONG = 260;

/** One message in the conversation with the tutor. */
export function ChatBubble({ turn, latest, onAddCard }: { turn: TutorTurn; latest: boolean; onAddCard?: (question: string, answer: string) => boolean }) {
  if (turn.role === 'learner') return <LearnerBubble turn={turn} />;
  if (turn.kind === 'clarification') return <ClarificationBubble turn={turn} />;
  return <FeedbackBubble turn={turn} latest={latest} onAddCard={onAddCard} />;
}

const COVERAGE = {
  covered: { icon: 'checkmark-circle', key: 'tutor.coverage.covered' },
  partial: { icon: 'ellipse-outline', key: 'tutor.coverage.partial' },
  missing: { icon: 'close-circle', key: 'tutor.coverage.missing' },
} as const;

/** Which key ideas the explanation covered (✓), touched (◐) or missed (✗). */
function Coverage({ items }: { items: NonNullable<NonNullable<TutorTurn['evaluation']>['coverage']> }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const tone = { covered: colors.success, partial: colors.accent, missing: colors.danger };
  const done = items.filter((i) => i.status === 'covered').length;
  return (
    <View style={styles.coverage} accessible accessibilityLabel={`${t('tutor.coverage.title')}: ${items.map((i) => `${i.idea} — ${t(COVERAGE[i.status].key)}`).join(', ')}`}>
      <Text style={[typography.caption, { fontWeight: '800' }]}>
        {t('tutor.coverage.title')} · {done}/{items.length}
      </Text>
      {items.map((item, i) => (
        <View key={i} style={styles.coverageRow}>
          <Ionicons name={COVERAGE[item.status].icon} size={18} color={tone[item.status]} />
          <Text style={[typography.body, { flex: 1 }, item.status === 'missing' && { color: colors.textMuted }]}>{item.idea}</Text>
        </View>
      ))}
    </View>
  );
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

function FeedbackBubble({ turn, latest, onAddCard }: { turn: TutorTurn; latest: boolean; onAddCard?: (question: string, answer: string) => boolean }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [details, setDetails] = useState(false);
  const [cardAdded, setCardAdded] = useState<boolean | null>(null);
  const e = turn.evaluation!;
  const shown = e.shown ?? { hints: 0, answer: false, model: false };
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
      {e.coverage?.length ? <Coverage items={e.coverage} /> : null}
      {e.question ? (
        <View style={styles.question}>
          <Text style={[typography.body, { fontWeight: '700' }]} selectable>
            ❓ {e.question}
          </Text>
        </View>
      ) : null}
      {(e.hints ?? []).slice(0, shown.hints).map((hint, i) => (
        <View key={`h${i}`} style={styles.help}>
          <Text style={[typography.caption, { fontWeight: '800' }]}>💡 {t('tutor.hintN', { n: i + 1 })}</Text>
          <Text style={typography.body} selectable>
            {hint}
          </Text>
        </View>
      ))}
      {shown.answer && e.question_answer ? (
        <View style={[styles.help, { borderColor: colors.success }]}>
          <Text style={[typography.caption, { fontWeight: '800' }]}>🔑 {t('tutor.answerTitle')}</Text>
          <Text style={typography.body} selectable>
            {e.question_answer}
          </Text>
          {onAddCard && e.question ? (
            cardAdded === null ? (
              <Pressable accessibilityRole="button" onPress={() => setCardAdded(onAddCard(e.question!, e.question_answer!))} style={styles.helpButton} hitSlop={6}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>{t('tutor.addCard')}</Text>
              </Pressable>
            ) : (
              <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>{cardAdded ? t('tutor.cardAdded') : t('tutor.cardExists')}</Text>
            )
          ) : null}
        </View>
      ) : null}
      {shown.model && e.model_explanation ? (
        <View style={[styles.help, { borderColor: colors.primary }]}>
          <Text style={[typography.caption, { fontWeight: '800' }]}>📖 {t('tutor.modelTitle')}</Text>
          <Text style={typography.body} selectable>
            {e.model_explanation}
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
  coverage: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  coverageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  help: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.md, padding: spacing.md, gap: 4, backgroundColor: colors.background },
  helpButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  detail: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
}));
