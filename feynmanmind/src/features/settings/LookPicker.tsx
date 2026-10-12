import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { usePrefsStore, type LookPref } from '@/state/prefsStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * Choose the app's style: the notebook (lab notebook by day, chalkboard by
 * night) or the classic clean look. Each option shows a small swatch of itself.
 */
export function LookPicker() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const look = usePrefsStore((s) => s.look);
  const set = usePrefsStore((s) => s.set);
  const options: { value: LookPref; title: string; body: string }[] = [
    { value: 'notebook', title: t('settings.look.notebook'), body: t('settings.look.notebookBody') },
    { value: 'classic', title: t('settings.look.classic'), body: t('settings.look.classicBody') },
  ];
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = look === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.title}. ${o.body}`}
            onPress={() => {
              haptics.tap();
              set({ look: o.value });
            }}
            style={[styles.option, on && { borderColor: colors.primary, borderWidth: 2 }]}
          >
            <Swatch look={o.value} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={typography.subheading}>{o.title}</Text>
              <Text style={typography.caption}>{o.body}</Text>
            </View>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** A thumbnail of the look: ruled paper next to a strip of chalkboard, or white with an indigo bar. */
function Swatch({ look }: { look: LookPref }) {
  const styles = useStyles();
  if (look === 'classic')
    return (
      <View style={[styles.swatch, { backgroundColor: '#F6F6FB' }]}>
        <View style={{ height: 14, borderRadius: 4, backgroundColor: '#4F46E5', margin: 6 }} />
        <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E2E2EE', marginHorizontal: 6, marginBottom: 4 }} />
        <View style={{ height: 6, width: '60%', borderRadius: 3, backgroundColor: '#E2E2EE', marginHorizontal: 6 }} />
      </View>
    );
  return (
    <View style={[styles.swatch, { flexDirection: 'row' }]}>
      <View style={{ flex: 1, backgroundColor: '#F4EBD6' }}>
        {[10, 20, 30, 40].map((y) => (
          <View key={y} style={{ position: 'absolute', top: y, left: 0, right: 0, height: 1, backgroundColor: 'rgba(110,140,175,0.45)' }} />
        ))}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 8, width: 1, backgroundColor: 'rgba(196,72,60,0.6)' }} />
      </View>
      <View style={{ flex: 1, backgroundColor: '#22392F', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: '#FFE27A', transform: [{ rotate: '-8deg' }] }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  swatch: { width: 64, height: 48, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
}));
