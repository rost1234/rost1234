import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AskContext } from '@/data/questions';
import { useQuestionThread } from '@/data/questions';
import { useT } from '@/i18n';
import { KeyboardInsetView } from '@/lib/keyboard';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { LessonQA } from './LessonQA';

/**
 * The 💬 button in the lesson's bottom bar (with the number of questions asked),
 * opening the lesson Q&A in a sheet from the bottom, so you can ask in the
 * middle of reading. The question box stays on top of the keyboard.
 */
export function AskButton({ context }: { context: AskContext }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const count = useQuestionThread(context.threadKey).length;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count ? `${t('lesson.ask.button')} (${count})` : t('lesson.ask.button')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
        {count ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardInsetView style={styles.backdrop} safeBottom={false}>
          <Pressable style={{ flex: 1, minHeight: 40 }} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={styles.grab} />
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={() => setOpen(false)} style={styles.close}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <LessonQA context={context} docked />
          </View>
        </KeyboardInsetView>
      </Modal>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  button: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { position: 'absolute', top: -4, end: -4, backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 5, alignItems: 'center' },
  countText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', minHeight: 32, justifyContent: 'center' },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  close: { position: 'absolute', end: 0, top: 0 },
}));
