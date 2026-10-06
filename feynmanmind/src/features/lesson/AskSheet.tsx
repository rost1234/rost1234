import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AskContext } from '@/data/questions';
import { useQuestionThread } from '@/data/questions';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { LessonQA } from './LessonQA';

/**
 * A floating "Ask a question" button that opens the lesson Q&A in a sheet from
 * the bottom, so you can ask in the middle of reading without losing your place.
 */
export function AskButton({ context, bottom }: { context: AskContext; bottom: number }) {
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
        style={({ pressed }) => [styles.fab, { bottom }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
        <Text style={styles.fabText}>{t('lesson.ask.button')}</Text>
        {count ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} accessibilityViewIsModal>
              <View style={styles.header}>
                <View style={styles.grab} />
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12} onPress={() => setOpen(false)} style={styles.close}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
                <LessonQA context={context} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  fab: {
    position: 'absolute',
    start: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: colors.primary, fontWeight: '800', fontSize: Math.round(15 * textScale) },
  count: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, paddingHorizontal: 5, alignItems: 'center' },
  countText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { maxHeight: '88%' },
  sheet: {
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
