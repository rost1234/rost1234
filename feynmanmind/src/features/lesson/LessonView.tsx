import { View } from 'react-native';
import { PinnedCard } from '@/components/Pinned';
import { SketchBorder, Squiggle, useSeed } from '@/components/sketch';
import { Text } from '@/components/Text';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { lessonPlainText, type LessonParts } from '@/content/lesson';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { CopyButton, LessonCard, paragraphsOf, readingMinutes } from './LessonCard';

/**
 * The structured lesson: the hook, the core idea in titled sections, an
 * example, a common misconception, how it connects, then the key points.
 * Lessons without parts (older AI lessons) fall back to the plain card.
 * All text can be selected and copied.
 */
export function LessonView({
  title,
  explanation,
  parts,
  keyPoints = [],
}: {
  title: string;
  explanation: string;
  parts?: LessonParts;
  keyPoints?: { question: string; answer: string }[];
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography, look } = useTheme();
  if (!parts) return <LessonCard title={title} explanation={explanation} keyPoints={keyPoints} />;

  const text = lessonPlainText(parts);
  const copyAll = () => {
    const points = keyPoints.map((p) => `• ${p.question}\n  ${p.answer}`).join('\n');
    return Clipboard.setStringAsync([title, text, points ? `${t('lesson.keyPoints')}:\n${points}` : ''].filter(Boolean).join('\n\n'));
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.headerRow}>
        <Ionicons name="book-outline" size={18} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>{t('lesson.title').toLocaleUpperCase()}</Text>
        <Text style={typography.caption}>· {t('lesson.readingTime', { n: readingMinutes(text) })}</Text>
        <View style={{ flex: 1 }} />
        <CopyButton onCopy={copyAll} label={t('lesson.copy')} />
      </View>

      {look === 'classic' ? (
        <View style={styles.hook}>
          <Text style={styles.hookText} selectable>
            🎯 {parts.hook}
          </Text>
        </View>
      ) : (
        <PinnedCard tilt={-0.4}>
          <Text style={styles.hookText} selectable>
            {parts.hook}
          </Text>
        </PinnedCard>
      )}

      <View style={styles.card}>
        {look === 'chalk' ? <SketchBorder color="rgba(238,240,232,0.7)" seed={23} radius={14} /> : null}
        {parts.sections.map((s, i) => (
          <View key={i} style={{ gap: spacing.sm }}>
            <SectionTitle text={s.heading} seed={i} />
            {paragraphsOf(s.body).map((p, j) => (
              <Text key={j} style={styles.paragraph} selectable>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {parts.example ? (
        <Box icon="search" tone={colors.primary} soft={colors.primarySoft} title={parts.example.title}>
          {paragraphsOf(parts.example.body).map((p, j) => (
            <Text key={j} style={styles.paragraph} selectable>
              {p}
            </Text>
          ))}
        </Box>
      ) : null}

      {parts.misconception ? (
        <Box icon="warning-outline" tone={colors.accent} soft={colors.accentSoft} title={t('lesson.misconception')}>
          <Text style={[styles.paragraph, styles.myth]} selectable>
            ✗ {parts.misconception.myth}
          </Text>
          <Text style={styles.paragraph} selectable>
            ✓ {parts.misconception.truth}
          </Text>
        </Box>
      ) : null}

      {parts.connection ? (
        <View style={styles.connection}>
          <Ionicons name="git-network-outline" size={18} color={colors.textMuted} />
          <Text style={[typography.body, { flex: 1, color: colors.textMuted }]} selectable>
            {parts.connection}
          </Text>
        </View>
      ) : null}

      {keyPoints.length ? (
        <Box icon="bulb-outline" tone={colors.success} soft={colors.successSoft} title={t('lesson.keyPoints')}>
          {keyPoints.map((p, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Text style={[typography.body, { fontWeight: '700' }]} selectable>
                {p.question}
              </Text>
              <Text style={[typography.body, { color: colors.textMuted }]} selectable>
                {p.answer}
              </Text>
            </View>
          ))}
        </Box>
      ) : null}
      <Text style={typography.caption}>{t('lesson.selectHint')}</Text>
    </View>
  );
}

/**
 * A section heading: on paper it's gone over with a yellow highlighter; on the
 * board it's chalked in blue and underlined; classic is plain bold.
 */
function SectionTitle({ text, seed }: { text: string; seed: number }) {
  const styles = useStyles();
  const { look, colors } = useTheme();
  if (look === 'paper')
    return (
      <View style={styles.markerWrap}>
        <View style={[styles.marker, { transform: [{ rotate: seed % 2 ? '0.6deg' : '-0.8deg' }] }]} />
        <Text style={styles.heading} accessibilityRole="header">
          {text}
        </Text>
      </View>
    );
  if (look === 'chalk')
    return (
      <View style={{ alignSelf: 'flex-start' }}>
        <Text style={styles.heading} accessibilityRole="header">
          {text}
        </Text>
        <Squiggle color={colors.ink} height={7} seed={seed + 4} style={{ marginTop: -4 }} />
      </View>
    );
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {text}
    </Text>
  );
}

function Box({ icon, tone, soft, title, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; tone: string; soft: string; title: string; children: React.ReactNode }) {
  const styles = useStyles();
  const { typography, look } = useTheme();
  const seed = useSeed();
  // Paper: a slip with a colored edge; board: a chalk frame in the tone; classic: a tinted box.
  const frame = look === 'paper' ? styles.boxPaper : look === 'chalk' ? styles.boxChalk : { backgroundColor: soft, borderColor: tone };
  return (
    <View style={[styles.box, frame, look === 'paper' && { borderRightColor: tone }]}>
      {look === 'chalk' ? <SketchBorder color={tone} seed={seed} radius={14} /> : null}
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={18} color={tone} />
        <Text style={[typography.subheading, { flex: 1 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale, look, fonts }) => ({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hook: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg },
  hookText:
    look === 'classic'
      ? { color: colors.onPrimary, fontSize: Math.round(18 * textScale), lineHeight: Math.round(28 * textScale), fontWeight: '700' }
      : { color: colors.text, fontSize: Math.round(18 * textScale), lineHeight: Math.round(27 * textScale), fontWeight: '700', fontStyle: 'italic' },
  card:
    look === 'paper'
      ? { backgroundColor: colors.surface, borderRadius: 3, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.lg, boxShadow: '0px 1px 0px #CDB68A, 0px 6px 14px rgba(90,60,20,0.10)' }
      : look === 'chalk'
        ? { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: spacing.lg, gap: spacing.lg }
        : { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.lg },
  heading:
    look === 'chalk'
      ? { color: colors.ink, fontFamily: fonts.hand, fontSize: Math.round(30 * textScale), lineHeight: Math.round(34 * textScale), fontWeight: '700' }
      : { color: colors.text, fontFamily: fonts.heading, fontSize: Math.round(19 * textScale), fontWeight: '800' },
  // A highlighter stroke behind the lower part of the heading.
  markerWrap: { alignSelf: 'flex-start', paddingHorizontal: 4 },
  marker: { position: 'absolute', left: 0, right: 0, bottom: 1, height: '52%', backgroundColor: colors.highlight, borderRadius: 3 },
  paragraph: { color: colors.text, fontSize: Math.round(17 * textScale), lineHeight: Math.round(29 * textScale) },
  myth: { color: colors.textMuted, textDecorationLine: 'line-through', textDecorationColor: look === 'classic' ? colors.textMuted : colors.danger },
  box: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  boxPaper: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 2, borderRightWidth: 4, boxShadow: '0px 1px 0px #CDB68A' },
  boxChalk: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0, borderRadius: 14 },
  connection: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
}));
