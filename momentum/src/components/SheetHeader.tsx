import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { makeStyles, radius, spacing, useTheme } from './theme';
import { useT } from '@/i18n';

/** Title row for screens that open on top of Home: a grab bar, the title and a close button. */
export function SheetHeader({ title }: { title: string }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.grab} />
      <View style={styles.row}>
        <Text style={[typography.title, styles.title]} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sheet.close')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={10}
          style={styles.close}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.sm, marginBottom: spacing.sm },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
}));
