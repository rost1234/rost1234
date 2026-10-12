import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SketchBorder, SketchCheck, useSeed } from '@/components/sketch';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

export type CheckState = 'new' | 'started' | 'done' | 'mastered';

/**
 * One line of a course checklist, as in a notebook: a hand-drawn box (empty, half
 * filled while in progress, ticked when done, starred when mastered), the title and
 * a line about it, and the score. The current one is marked "← now" and highlighted.
 * Rows stack with no gap inside a screen that spaces its children (`first` / `last` round the ends);
 * in a plain view, pass `flush`.
 */
export function ChecklistRow({
  title,
  subtitle,
  state,
  score,
  current,
  needsAi,
  accent,
  first,
  last,
  onPress,
  onLayout,
  a11yLabel,
  flush,
}: {
  title: string;
  subtitle?: string;
  state: CheckState;
  score?: number;
  current?: boolean;
  /** The lesson isn't written yet (the AI writes it on first visit). */
  needsAi?: boolean;
  accent: string;
  first?: boolean;
  last?: boolean;
  onPress: () => void;
  onLayout?: (y: number) => void;
  a11yLabel: string;
  /** The rows sit in a plain view (no gap between children to cancel). */
  flush?: boolean;
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, look, map } = useTheme();
  const seed = useSeed();
  const chalk = look === 'chalk';
  const done = state === 'done' || state === 'mastered';
  const ink = chalk ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}
      style={({ pressed }) => [
        styles.row,
        first && styles.first,
        last && styles.last,
        flush && { marginTop: 0 },
        current && { backgroundColor: look === 'paper' ? 'rgba(255,205,60,0.26)' : 'rgba(255,226,122,0.10)' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.box, { borderColor: state === 'new' ? colors.border : accent }]}>
        {chalk ? <SketchBorder color={state === 'new' ? 'rgba(238,240,232,0.5)' : accent} seed={seed} radius={5} width={2} /> : null}
        {state === 'started' ? <View style={[styles.half, { backgroundColor: accent }]} /> : null}
        {done ? (
          <View style={styles.tick}>
            <SketchCheck size={30} color={state === 'mastered' ? map.gold.main : ink} />
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, current && styles.titleNow, done && { color: colors.textMuted }, state === 'done' && styles.struck]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {current ? <Text style={styles.now}>← {t('plan.now')}</Text> : null}
      {score !== undefined && score > 0 ? <Text style={[styles.score, { color: state === 'mastered' ? map.gold.main : colors.textMuted }]}>{score}</Text> : null}
      {needsAi ? <Ionicons name="sparkles-outline" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, look, fonts, textScale }) => {
  const line = look === 'chalk' ? 'rgba(238,240,232,0.22)' : colors.border;
  return {
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 58,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      // Cancel the screen's gap so the rows form one list.
      marginTop: -spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: line,
      borderLeftWidth: look === 'chalk' ? 0 : 1,
      borderRightWidth: look === 'chalk' ? 0 : 1,
      borderLeftColor: colors.border,
      borderRightColor: colors.border,
      backgroundColor: look === 'paper' ? colors.surface : 'transparent',
    },
    first: { borderTopWidth: look === 'chalk' ? 0 : 1, borderTopColor: colors.border, borderTopLeftRadius: 3, borderTopRightRadius: 3, marginTop: -spacing.lg + spacing.sm },
    last: { borderBottomLeftRadius: 3, borderBottomRightRadius: 3, borderBottomColor: look === 'chalk' ? line : colors.border },
    box: { width: 26, height: 26, borderWidth: look === 'chalk' ? 0 : 1.75, borderRadius: look === 'chalk' ? 5 : 3, alignItems: 'center', justifyContent: 'center' },
    half: { width: 12, height: 12, borderRadius: 2, opacity: 0.85 },
    // The tick spills out of its box, the way a quick pen mark does.
    tick: { position: 'absolute', left: 0, bottom: -1 },
    text: { flex: 1, gap: 1 },
    title: { color: colors.text, fontFamily: fonts.body, fontSize: Math.round(17 * textScale), lineHeight: Math.round(23 * textScale), fontWeight: '700' },
    titleNow: { fontWeight: '800' },
    struck: { textDecorationLine: 'line-through', textDecorationColor: colors.danger },
    sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: Math.round(13 * textScale) },
    now: { fontFamily: fonts.hand, fontWeight: '700', fontSize: look === 'chalk' ? 24 : 22, color: look === 'chalk' ? colors.primary : colors.danger },
    score: { fontFamily: fonts.hand, fontWeight: '700', fontSize: 24, minWidth: 28, textAlign: 'center' },
  };
});
