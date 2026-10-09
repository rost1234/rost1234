import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LessonCard } from '@/features/lesson/LessonCard';
import { useT } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { useBottomInset } from '@/lib/safeArea';

export interface PeekLesson {
  title: string;
  text: string;
  keyPoints: { question: string; answer: string }[];
}

/** "📖 Lesson": opens the lesson in a sheet (closing the keyboard), without leaving what you're writing. */
export function LessonPeekButton({ lesson, compact }: { lesson: PeekLesson | null; compact?: boolean }) {
  const t = useT();
  const styles = useStyles();
  const { colors } = useTheme();
  const bottomInset = useBottomInset();
  const [open, setOpen] = useState(false);
  if (!lesson) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('tutor.showLesson')} onPress={() => setOpen(true)} hitSlop={8} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
        <Ionicons name="book-outline" size={16} color={colors.primary} />
        {!compact ? <Text style={styles.chipText}>{t('tutor.lesson')}</Text> : null}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
          <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, spacing.md) }]} accessibilityViewIsModal>
            <View style={styles.head}>
              <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>
                {lesson.title}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('tutor.backToWriting')} onPress={() => setOpen(false)} style={styles.back}>
                <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.backText}>{t('tutor.backToWriting')}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
              <LessonCard title={lesson.title} explanation={lesson.text} keyPoints={lesson.keyPoints} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles(({ colors, textScale }) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: Math.round(14 * textScale) },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: Math.round(18 * textScale), fontWeight: '800' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 36 },
  backText: { color: colors.onPrimary, fontWeight: '800', fontSize: Math.round(14 * textScale) },
}));
