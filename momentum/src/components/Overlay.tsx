import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { haptics } from '@/core/haptics';
import { t } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SheetAction {
  label: string;
  icon: IconName;
  run: () => void;
  destructive?: boolean;
}

interface ActionSheetRequest {
  kind: 'sheet';
  title: string;
  message?: string;
  actions: SheetAction[];
}

interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: IconName;
  onConfirm: () => void;
}

type Request = ActionSheetRequest | ConfirmRequest;

const useOverlayStore = create<{ request: Request | null; id: number }>(() => ({ request: null, id: 0 }));

/** Themed bottom sheet of actions (replaces the system action sheet / Alert menu). */
export function showActionSheet(request: Omit<ActionSheetRequest, 'kind'>): void {
  useOverlayStore.setState((s) => ({ request: { kind: 'sheet', ...request }, id: s.id + 1 }));
}

/** Themed confirmation dialog (replaces a two-button system Alert). */
export function showConfirm(request: Omit<ConfirmRequest, 'kind'>): void {
  useOverlayStore.setState((s) => ({ request: { kind: 'confirm', ...request }, id: s.id + 1 }));
}

const IN_MS = 220;
const OUT_MS = 160;

/** Mount once near the root. */
export function OverlayHost() {
  const request = useOverlayStore((s) => s.request);
  const id = useOverlayStore((s) => s.id);
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);

  useEffect(() => {
    if (!request) return;
    closing.current = false;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [id, request, progress]);

  // The action runs after the overlay is gone, so navigation and new dialogs don't fight it.
  const close = (then?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      if (useOverlayStore.getState().id === id) useOverlayStore.setState({ request: null });
      then?.();
    });
  };

  if (!request) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={{ flex: 1, opacity: progress }}>
        <Pressable style={backdropStyle} accessibilityLabel={t('common.cancel')} onPress={() => close()} />
      </Animated.View>
      {request.kind === 'sheet' ? (
        <Sheet request={request} progress={progress} close={close} />
      ) : (
        <Confirm request={request} progress={progress} close={close} />
      )}
    </Modal>
  );
}

const backdropStyle = { flex: 1, backgroundColor: 'rgba(8, 9, 24, 0.55)' } as const;

interface PartProps<R> {
  request: R;
  progress: Animated.Value;
  close: (then?: () => void) => void;
}

function Sheet({ request, progress, close }: PartProps<ActionSheetRequest>) {
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottom = useSafeAreaInsets().bottom;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Animated.View style={[styles.sheet, { paddingBottom: bottom + spacing.lg, transform: [{ translateY }] }]}>
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Text style={typography.heading} numberOfLines={2}>
          {request.title}
        </Text>
        {request.message ? <Text style={typography.caption}>{request.message}</Text> : null}
      </View>
      <View style={styles.actions}>
        {request.actions.map((action) => {
          const tint = action.destructive ? colors.danger : colors.text;
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                haptics.tap();
                close(action.run);
              }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: action.destructive ? colors.dangerSoft : colors.primarySoft }]}>
                <Ionicons name={action.icon} size={20} color={action.destructive ? colors.danger : colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: tint }]}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => close()}
        style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Confirm({ request, progress, close }: PartProps<ConfirmRequest>) {
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const tone = request.destructive ? { bg: colors.danger, soft: colors.dangerSoft } : { bg: colors.primary, soft: colors.primarySoft };

  return (
    <View style={styles.center} pointerEvents="box-none">
      <Animated.View style={[styles.dialog, { opacity: progress, transform: [{ scale }] }]} accessibilityViewIsModal>
        <View style={[styles.dialogIcon, { backgroundColor: tone.soft }]}>
          <Ionicons name={request.icon ?? (request.destructive ? 'warning-outline' : 'help-circle-outline')} size={26} color={tone.bg} />
        </View>
        <Text style={[typography.heading, styles.centerText]}>{request.title}</Text>
        {request.message ? <Text style={[typography.caption, styles.centerText, styles.message]}>{request.message}</Text> : null}
        <View style={styles.dialogButtons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => close()}
            style={({ pressed }) => [styles.dialogButton, { backgroundColor: colors.surfaceMuted }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.dialogButtonLabel, { color: colors.text }]}>{request.cancelLabel ?? t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.tap();
              close(request.onConfirm);
            }}
            style={({ pressed }) => [styles.dialogButton, { backgroundColor: tone.bg }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.dialogButtonLabel, { color: colors.onPrimary }]}>{request.confirmLabel}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow,
    elevation: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.md },
  header: { gap: spacing.xs, paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  actions: { borderRadius: radius.lg, backgroundColor: colors.background, overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 56 },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  cancel: { marginTop: spacing.md, minHeight: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  cancelLabel: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow,
    elevation: 12,
  },
  dialogIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  centerText: { textAlign: 'center' },
  message: { marginTop: spacing.sm, lineHeight: 19 },
  dialogButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, alignSelf: 'stretch' },
  dialogButton: { flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  dialogButtonLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
}));
