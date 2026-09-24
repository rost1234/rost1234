import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius, spacing } from './theme';

export function SkeletonBlock({ width = '100%', height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceMuted, opacity }} />;
}

/** Placeholder matching the habit card layout. */
export function HabitCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Loading habit">
      <SkeletonBlock width="55%" height={18} />
      <SkeletonBlock width="35%" height={12} />
      <SkeletonBlock height={8} rounded={4} />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.container} accessibilityLabel="Loading dashboard">
      <SkeletonBlock width="45%" height={28} />
      <SkeletonBlock height={10} rounded={5} />
      <View style={{ height: spacing.lg }} />
      <HabitCardSkeleton />
      <HabitCardSkeleton />
      <HabitCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, padding: spacing.lg },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
