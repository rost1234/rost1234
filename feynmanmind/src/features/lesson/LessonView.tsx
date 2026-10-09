import { Text, View } from 'react-native';
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
  const { colors, typography } = useTheme();
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

      <View style={styles.hook}>
        <Text style={styles.hookText} selectable>
          🎯 {parts.hook}
        </Text>
      </View>

      <View style={styles.card}>
        {parts.sections.map((s, i) => (
          <View key={i} style={{ gap: spacing.sm }}>
            <Text style={styles.heading} accessibilityRole="header">
              {s.heading}
            </Text>
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

function Box({ icon, tone, soft, title, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; tone: string; soft: string; title: string; children: React.ReactNode }) {
  const styles = useStyles();
  const { typography } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: soft, borderColor: tone }]}>
      <View style={styles.headerRow}>
        <Ionicons name={icon} size={18} color={tone} />
        <Text style={[typography.subheading, { flex: 1 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hook: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg },
  hookText: { color: colors.onPrimary, fontSize: Math.round(18 * textScale), lineHeight: Math.round(28 * textScale), fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.lg },
  heading: { color: colors.text, fontSize: Math.round(19 * textScale), fontWeight: '800' },
  paragraph: { color: colors.text, fontSize: Math.round(17 * textScale), lineHeight: Math.round(29 * textScale) },
  myth: { color: colors.textMuted, textDecorationLine: 'line-through' },
  box: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  connection: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
}));
