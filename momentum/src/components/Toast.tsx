import { useEffect, useState } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, radius, spacing } from './theme';

interface ToastProps {
  /** Changing this restarts the toast. */
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide: () => void;
  durationMs?: number;
  /** Sit above Home's floating Focus button instead of covering it. */
  aboveFab?: boolean;
}

const FAB_CLEARANCE = 64;

/** Small bottom toast with an optional action (e.g. Undo). */
export function Toast({ id, message, actionLabel, onAction, onHide, durationMs = 4000, aboveFab }: ToastProps) {
  const styles = useStyles();
  const bottom = useSafeAreaInsets().bottom + spacing.lg + (aboveFab ? FAB_CLEARANCE : 0);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide());
    }, durationMs);
    return () => clearTimeout(timeout);
  }, [id, durationMs, onHide, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity, bottom }]} accessibilityLiveRegion="polite">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles(({ shadow }) => ({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#23244A',
    ...shadow,
    shadowOpacity: 0.25,
  },
  message: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  action: { color: '#A5B4FC', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
}));
