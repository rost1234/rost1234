import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Splits a lesson into paragraphs (blank-line separated). */
export const paragraphsOf = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Rough reading time in minutes (Hebrew and English both ≈ 180 words a minute for study reading). */
export const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 180));

/**
 * The lesson itself: large, well-spaced text that can be selected and copied
 * (long-press a paragraph, or copy everything with the button), followed by
 * the key points to remember.
 */
export function LessonCard({ title, explanation, keyPoints = [] }: { title: string; explanation: string; keyPoints?: { question: string; answer: string }[] }) {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const paragraphs = paragraphsOf(explanation);

  const copyAll = async () => {
    const points = keyPoints.map((p) => `• ${p.question}\n  ${p.answer}`).join('\n');
    const text = [title, paragraphs.join('\n\n'), points ? `${t('lesson.keyPoints')}:\n${points}` : ''].filter(Boolean).join('\n\n');
    await Clipboard.setStringAsync(text);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="book-outline" size={18} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>{t('lesson.title').toLocaleUpperCase()}</Text>
        <Text style={typography.caption}>· {t('lesson.readingTime', { n: readingMinutes(explanation) })}</Text>
        <View style={{ flex: 1 }} />
        <CopyButton onCopy={copyAll} label={t('lesson.copy')} />
      </View>

      {paragraphs.map((paragraph, i) => (
        <Text key={i} style={[styles.paragraph, i === 0 && styles.lead]} selectable>
          {paragraph}
        </Text>
      ))}

      {keyPoints.length ? (
        <View style={styles.points}>
          <View style={styles.header}>
            <Ionicons name="bulb-outline" size={18} color={colors.warning} />
            <Text style={[typography.subheading, { flex: 1 }]}>{t('lesson.keyPoints')}</Text>
          </View>
          {keyPoints.map((p, i) => (
            <View key={i} style={styles.point}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.body, { fontWeight: '700' }]} selectable>
                  {p.question}
                </Text>
                <Text style={[typography.body, { color: colors.textMuted }]} selectable>
                  {p.answer}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={typography.caption}>{t('lesson.selectHint')}</Text>
    </View>
  );
}

/** A small "copy" button that confirms with a check mark for a moment. */
export function CopyButton({ onCopy, label }: { onCopy: () => Promise<unknown> | void; label: string }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={async () => {
        await onCopy();
        haptics.success();
        setCopied(true);
      }}
      style={({ pressed }) => [styles.copy, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? colors.success : colors.primary} />
      <Text style={[styles.copyText, { color: copied ? colors.success : colors.primary }]}>{copied ? t('lesson.copied') : t('lesson.copyShort')}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paragraph: { color: colors.text, fontSize: Math.round(17 * textScale), lineHeight: Math.round(29 * textScale) },
  lead: { fontWeight: '600' },
  points: {
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  point: { flexDirection: 'row', gap: spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  copyText: { fontSize: 13, fontWeight: '700' },
}));
