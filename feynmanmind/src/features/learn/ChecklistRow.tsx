import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

export type CheckState = 'new' | 'started' | 'done' | 'mastered';

/**
 * One line of a course list in the notebook looks, as in a bullet journal: a dot
 * that stays, the title struck out by hand once it's done (with a small gold star
 * when mastered), and the current one highlighted with a "here I stopped" sticky
 * note. Rows stack with no gap inside a screen that spaces its children; in a
 * plain view, pass `flush`.
 */
export function ChecklistRow({
  title,
  state,
  current,
  needsAi,
  first,
  onPress,
  onLayout,
  a11yLabel,
  flush,
}: {
  title: string;
  state: CheckState;
  current?: boolean;
  /** The lesson isn't written yet (the AI writes it on first visit). */
  needsAi?: boolean;
  first?: boolean;
  onPress: () => void;
  onLayout?: (y: number) => void;
  a11yLabel: string;
  /** The rows sit in a plain view (no gap between children to cancel). */
  flush?: boolean;
}) {
  const t = useT();
  const styles = useStyles();
  const { colors, look, map } = useTheme();
  const done = state === 'done' || state === 'mastered';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}
      style={({ pressed }) => [styles.row, first && styles.first, flush && { marginTop: 0 }, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.dot} />
      <View style={styles.text}>
        <View style={[styles.titleWrap, current && styles.marker]}>
          <Text style={[styles.title, current && styles.titleNow, done && styles.titleDone]} numberOfLines={2}>
            {title}
          </Text>
          {done ? <Strike color={look === 'chalk' ? colors.primary : colors.danger} /> : null}
        </View>
        {state === 'mastered' ? <Text style={[styles.star, { color: map.gold.main }]}>★</Text> : null}
        {needsAi && !done ? <Ionicons name="sparkles-outline" size={14} color={colors.textMuted} /> : null}
      </View>
      {current ? (
        <View style={styles.sticky}>
          <Text style={styles.stickyText}>{t('plan.leftOff')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A unit's heading in the notebook list: a handwritten title, a thin rule and the count. */
export function ChecklistHeading({ title, done, total }: { title: string; done: number; total: number }) {
  const styles = useStyles();
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle} accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.rule} />
      <Text style={styles.count}>{`${done}/${total}`}</Text>
    </View>
  );
}

/** A quick pen stroke through the text it covers, one per line of text. */
function Strike({ color }: { color: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { textScale } = useTheme();
  const lineHeight = Math.round(23 * textScale);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.abs(w - size.w) > 0.5 || Math.abs(h - size.h) > 0.5) setSize({ w, h });
  };
  const lines = Math.max(1, Math.round(size.h / lineHeight));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: -4, right: -4 }} onLayout={onLayout}>
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          {Array.from({ length: lines }, (_, i) => {
            const y = (i + 0.58) * (size.h / lines);
            const w = size.w;
            return (
              <Path
                key={i}
                d={`M 0 ${y + 1.2} C ${w * 0.3} ${y - 1.8}, ${w * 0.6} ${y + 2}, ${w} ${y - 1}`}
                stroke={color}
                strokeWidth={1.9}
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, look, fonts, textScale }) => {
  const chalk = look === 'chalk';
  return {
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 44,
      paddingVertical: 6,
      paddingHorizontal: spacing.xs,
      // Cancel the screen's gap so the rows form one list.
      marginTop: -spacing.lg,
    },
    first: { marginTop: -spacing.lg + spacing.xs },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text, opacity: 0.85, marginHorizontal: 4 },
    text: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    titleWrap: { paddingHorizontal: 3, flexShrink: 1 },
    marker: { backgroundColor: chalk ? 'rgba(255,226,122,0.26)' : 'rgba(255,205,60,0.55)', borderRadius: 2 },
    title: { color: colors.text, fontFamily: fonts.body, fontSize: Math.round(17 * textScale), lineHeight: Math.round(23 * textScale) },
    titleNow: { fontWeight: '800' },
    titleDone: { opacity: 0.68 },
    star: { fontSize: 17 },
    sticky: {
      backgroundColor: '#FFE27A',
      paddingHorizontal: 8,
      paddingVertical: 1,
      transform: [{ rotate: '-4deg' }],
      boxShadow: '1px 2px 3px rgba(0,0,0,0.22)',
    },
    stickyText: { fontFamily: fonts.hand, fontWeight: '700', fontSize: 19, lineHeight: 24, color: '#4A3A00' },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    headingTitle: { fontFamily: fonts.hand, fontWeight: '700', fontSize: Math.round(27 * textScale), lineHeight: Math.round(32 * textScale), color: colors.text, flexShrink: 1 },
    rule: { flex: 1, height: 1.5, backgroundColor: colors.text, opacity: 0.28, minWidth: 16 },
    count: { fontFamily: fonts.hand, fontWeight: '700', fontSize: 22, color: colors.ink },
  };
});
