import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useKeyboardHeight } from '@/hooks/useKeyboardOpen';
import { useT } from '@/i18n';

interface FormSheetProps {
  title: string;
  /** A line under the title explaining what this is for. */
  hint?: string;
  children?: ReactNode;
  onClose: () => void;
  /** The main button; without it the sheet only closes. */
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  /** A quiet second button under the main one ("Without", "Bring back now"…). */
  secondary?: { label: string; onPress: () => void };
}

/** A small bottom window for one setting of a habit. It rides above the keyboard. */
export function FormSheet({ title, hint, children, onClose, doneLabel, onDone, doneDisabled, secondary }: FormSheetProps) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const screenHeight = useWindowDimensions().height;
  // A Modal with a translucent navigation bar is edge to edge, so the keyboard isn't avoided for us.
  const keyboard = useKeyboardHeight();
  const maxHeight = keyboard > 0 ? Math.max(160, screenHeight - keyboard - insets.top - 240) : screenHeight * 0.65;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={t('sheet.close')} onPress={onClose} />
      <View
        accessibilityViewIsModal
        style={[styles.sheet, keyboard > 0 ? { bottom: keyboard, paddingBottom: spacing.md } : { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View style={styles.grab} />
        <View style={styles.header}>
          <Text style={[typography.heading, { flex: 1 }]} accessibilityRole="header">
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('sheet.close')} onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        {hint ? <Text style={typography.caption}>{hint}</Text> : null}
        {children ? (
          <ScrollView style={{ maxHeight }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : null}
        {doneLabel && onDone ? <Button label={doneLabel} onPress={onDone} disabled={doneDisabled} /> : null}
        {secondary ? <Button label={secondary.label} onPress={secondary.onPress} variant="ghost" /> : null}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  scrim: { flex: 1, backgroundColor: 'rgba(8, 9, 24, 0.55)' },
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
    gap: spacing.sm,
  },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  body: { gap: spacing.md, paddingVertical: spacing.sm },
}));
