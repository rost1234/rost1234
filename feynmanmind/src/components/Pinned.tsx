import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, spacing, useTheme } from '@/theme';

/**
 * A card that stands out from the page: on paper, a slightly tilted sheet held
 * by a strip of tape; on the chalkboard, a dashed yellow chalk outline.
 */
export function PinnedCard({ children, style, tilt = -0.6 }: { children: ReactNode; style?: StyleProp<ViewStyle>; tilt?: number }) {
  const styles = useStyles();
  const { isDark } = useTheme();
  return (
    <View style={[styles.card, !isDark && { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={styles.tape} />
      {children}
    </View>
  );
}

const useStyles = makeStyles(({ colors, isDark }) => ({
  card: isDark
    ? {
        borderWidth: 2.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 22,
        borderBottomLeftRadius: 12,
        padding: spacing.lg,
        gap: spacing.xs,
      }
    : {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 2,
        padding: spacing.lg,
        paddingTop: spacing.lg + 4,
        gap: spacing.xs,
        boxShadow: '0px 1px 0px #CDB68A, 0px 8px 18px rgba(90,60,20,0.14)',
      },
  tape: isDark
    ? { display: 'none' }
    : {
        position: 'absolute',
        top: -11,
        right: 28,
        width: 86,
        height: 22,
        backgroundColor: 'rgba(222,204,150,0.82)',
        transform: [{ rotate: '-4deg' }],
        boxShadow: '0px 1px 2px rgba(0,0,0,0.08)',
      },
}));
