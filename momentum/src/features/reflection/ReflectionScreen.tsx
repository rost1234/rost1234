import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { runDetached, toErrorMessage } from '@/core/errors';
import { getLocalDeviceDate, type LocalDateString } from '@/core/localDate';
import { SkeletonBlock } from '@/components/Skeleton';
import { Banner, Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import type { DailyReflection, MoodScore } from '@/domain/models';
import { useReflectionStore } from '@/state/reflectionStore';
import { MOOD_OPTIONS } from './mood';
import { type TranslationKey, useT } from '@/i18n';
import { useBottomSpace } from '@/components/useBottomSpace';

type Step = 1 | 2 | 3;

const PROMPTS: Record<Exclude<Step, 1>, { title: TranslationKey; placeholder: TranslationKey }> = {
  2: { title: 'refl.gratitude', placeholder: 'refl.gratitudePh' },
  3: { title: 'refl.lesson', placeholder: 'refl.lessonPh' },
};

function MoodPicker({ value, onChange }: { value: MoodScore | null; onChange: (score: MoodScore) => void }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.moodRow} accessibilityRole="radiogroup">
      {MOOD_OPTIONS.map((option) => {
        const selected = value === option.score;
        return (
          <Pressable
            key={option.score}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t('refl.moodA11y', { label: t(option.label), score: option.score })}
            onPress={() => onChange(option.score)}
            style={[styles.mood, selected && styles.moodSelected]}
          >
            <Text style={styles.moodEmoji}>{option.emoji}</Text>
            <Text style={[typography.caption, selected && { color: colors.primary, fontWeight: '700' }]}>{t(option.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReflectionScreen() {
  const styles = useStyles();
  // The reflection belongs to the day it was opened on, even if saved after midnight.
  const [logDate] = useState(() => getLocalDeviceDate());
  const existing = useReflectionStore((s) => s.byDate[logDate]);
  const loadForDate = useReflectionStore((s) => s.loadForDate);

  useEffect(() => {
    if (existing === undefined) runDetached(loadForDate(logDate));
  }, [existing, loadForDate, logDate]);

  if (existing === undefined) {
    return (
      <View style={[styles.flex, styles.content]}>
        <SkeletonBlock width="60%" height={28} />
        <SkeletonBlock height={80} />
      </View>
    );
  }
  // Prefilled when editing today's existing entry.
  return <ReflectionForm logDate={logDate} initial={existing} />;
}

function ReflectionForm({ logDate, initial }: { logDate: LocalDateString; initial: DailyReflection | null }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const save = useReflectionStore((s) => s.save);
  const [step, setStep] = useState<Step>(1);
  const [mood, setMood] = useState<MoodScore | null>(initial?.moodScore ?? null);
  const [gratitude, setGratitude] = useState(initial?.gratitudeText ?? '');
  const [lesson, setLesson] = useState(initial?.lessonText ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (mood === null) return;
    setIsSaving(true);
    try {
      await save({ logDate, moodScore: mood, gratitudeText: gratitude, lessonText: lesson });
      router.back();
    } catch (e) {
      setError(t('refl.saveError', { error: toErrorMessage(e) }));
      setIsSaving(false);
    }
  };

  const canContinue = step !== 1 || mood !== null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
        <Text style={typography.caption}>{t('refl.stepOf', { step })}</Text>
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

        {step === 1 ? (
          <>
            <Text style={typography.title}>{t('refl.howWasToday')}</Text>
            <MoodPicker value={mood} onChange={setMood} />
          </>
        ) : (
          <>
            <Text style={typography.title}>{t(PROMPTS[step].title)}</Text>
            <TextInput
              key={step}
              value={step === 2 ? gratitude : lesson}
              onChangeText={step === 2 ? setGratitude : setLesson}
              placeholder={t(PROMPTS[step].placeholder)}
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              maxLength={280}
              style={styles.input}
              accessibilityLabel={t(PROMPTS[step].title)}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? <Button label={t('common.back')} variant="ghost" onPress={() => setStep((s) => (s - 1) as Step)} /> : null}
        <View style={{ flex: 1 }} />
        {step < 3 ? (
          <Button label={t('common.next')} onPress={() => setStep((s) => (s + 1) as Step)} disabled={!canContinue} />
        ) : (
          <Button label={t('refl.save')} onPress={() => void submit()} loading={isSaving} disabled={mood === null} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  mood: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  moodSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  moodEmoji: { fontSize: 32 },
  input: {
    ...typography.body,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
}));
