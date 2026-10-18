import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TextInput } from '@/components/AppText';
import { Toast } from '@/components/Toast';
import { Banner, Button, Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { toErrorMessage } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { templateGroups, type HabitPreset } from '@/domain/presets';
import { Sprout } from '@/features/garden/Sprout';
import { useHabitStore } from '@/state/habitStore';
import { useT, type TranslationKey } from '@/i18n';
import { canSave, draftFromPreset, emptyDraft, hasHabitTitled, matchIdeas, toNewHabit, type HabitDraft } from './draft';
import { ExtrasList } from './ExtrasList';
import { AmountField, ReminderSwitch, ScheduleField, Stepper, TextWithIdeas } from './fields';
import { summaryLine } from './summary';

type Mode = 'start' | 'own' | 'quit';

const QUIT_IDEAS: TranslationKey[] = ['hf.quitIdea1', 'hf.quitIdea2', 'hf.quitIdea3', 'hf.quitIdea4'];
const QUIT_CUE_IDEAS: TranslationKey[] = ['hf.quitCueIdea1', 'hf.quitCueIdea2', 'hf.quitCueIdea3'];
const INSTEAD_IDEAS: TranslationKey[] = ['hf.insteadIdea1', 'hf.insteadIdea2', 'hf.insteadIdea3', 'hf.insteadIdea4'];

/** The sprout (Garden look) or nothing, beside a short question. */
function Ask({ text }: { text: string }) {
  const { typography, look } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.ask}>
      {look === 'garden' ? <Sprout stage={1} mood="happy" size={48} /> : null}
      <Text style={[typography.heading, { flex: 1 }]} accessibilityRole="header">
        {text}
      </Text>
    </View>
  );
}

/** Add a habit: build or quit, a ready-made idea in one tap, or your own in one line. */
export function NewHabitScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const addHabit = useHabitStore((s) => s.addHabit);
  const removeNewHabit = useHabitStore((s) => s.removeNewHabit);
  const habits = useHabitStore((s) => s.habits);
  const groups = useMemo(() => templateGroups(t.language), [t.language]);

  const [mode, setMode] = useState<Mode>('start');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HabitDraft>(() => emptyDraft());
  const [showSettings, setShowSettings] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [quitStep, setQuitStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ideas added from this screen, so "Undo" can take one back.
  const [added, setAdded] = useState<{ key: string; habitId: string; title: string; at: number } | null>(null);
  const hideToast = useCallback(() => setAdded(null), []);
  // Each toast gets its own id, so a second idea restarts its timer.
  const toastSeq = useRef(0);

  const patch = (p: Partial<HabitDraft>) => setDraft((cur) => ({ ...cur, ...p }));
  const anchors = habits.filter((h) => !h.isQuit);
  const groupNames = [...new Set(habits.map((h) => h.groupName).filter((g) => g.length > 0))];

  // Ideas being saved right now, so a quick second tap doesn't add the same one twice.
  const pendingIdeas = useRef(new Set<string>());

  const addIdea = async (preset: HabitPreset) => {
    if (pendingIdeas.current.has(preset.habit.title) || hasHabitTitled(useHabitStore.getState().habits, preset.habit.title)) return;
    pendingIdeas.current.add(preset.habit.title);
    haptics.success();
    try {
      const habit = await addHabit(preset.habit);
      setAdded({ key: preset.key, habitId: habit.id, title: habit.title, at: ++toastSeq.current });
    } catch (e) {
      setError(t('form.saveError', { error: toErrorMessage(e) }));
    } finally {
      pendingIdeas.current.delete(preset.habit.title);
    }
  };

  const undoIdea = () => {
    if (!added) return;
    void removeNewHabit(added.habitId);
    setAdded(null);
  };

  const save = async (override: Partial<HabitDraft> = {}) => {
    const final = { ...draft, ...override };
    if (!canSave(final) || saving) return;
    setSaving(true);
    try {
      await addHabit(toNewHabit(final));
      haptics.success();
      router.back();
    } catch (e) {
      setError(t('form.saveError', { error: toErrorMessage(e) }));
      setSaving(false);
    }
  };

  const startOwn = (from?: HabitPreset) => {
    setDraft(from ? draftFromPreset(from) : emptyDraft());
    setShowSettings(false);
    setShowExtras(false);
    setMode('own');
  };

  const startQuit = () => {
    setDraft(emptyDraft(true));
    setQuitStep(1);
    setMode('quit');
  };

  const shownGroups = groupId ? groups.filter((g) => g.id === groupId) : groups;
  const suggestions = mode === 'own' ? matchIdeas(groups, draft.title).filter((p) => p.habit.title !== draft.title) : [];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + spacing.xxl }]} keyboardShouldPersistTaps="handled">
        {error ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

        {mode === 'start' ? (
          <>
            <View style={styles.kinds} accessibilityRole="radiogroup">
              <KindCard icon="🌱" title={t('hf.build')} hint={t('hf.buildHint')} selected onPress={() => undefined} />
              <KindCard icon="🍃" title={t('hf.quit')} hint={t('hf.quitHint')} selected={false} onPress={startQuit} />
            </View>
            <Text style={typography.label}>{t('hf.ideas')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label={t('hf.all')} selected={groupId === null} onPress={() => setGroupId(null)} />
              {groups.map((g) => (
                <Chip key={g.id} label={`${g.emoji} ${g.title}`} selected={groupId === g.id} onPress={() => setGroupId(g.id)} />
              ))}
            </ScrollView>
            <View style={styles.ideas}>
              {shownGroups.flatMap((g) =>
                g.presets.map((preset) => {
                  const exists = hasHabitTitled(habits, preset.habit.title);
                  return (
                    <Pressable
                      key={`${g.id}-${preset.key}`}
                      accessibilityRole="button"
                      accessibilityLabel={exists ? t('hf.ideaHaveA11y', { title: preset.habit.title }) : t('hf.ideaAddA11y', { title: preset.habit.title, summary: preset.summary })}
                      accessibilityState={{ disabled: exists }}
                      disabled={exists}
                      onPress={() => void addIdea(preset)}
                      style={({ pressed }) => [styles.idea, exists && styles.ideaHave, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.ideaEmoji}>{g.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.label}>{preset.habit.title}</Text>
                        <Text style={typography.caption}>{preset.summary}</Text>
                      </View>
                      {exists ? <Text style={[typography.caption, { color: colors.success }]}>{t('hf.have')}</Text> : <Ionicons name="add-circle" size={28} color={colors.primary} />}
                    </Pressable>
                  );
                }),
              )}
            </View>
            <Text style={typography.caption}>{t('hf.ideasHint')}</Text>
            <Pressable accessibilityRole="button" onPress={() => startOwn()} style={({ pressed }) => [styles.own, pressed && { opacity: 0.8 }]}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary }]}>{t('hf.own')}</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'own' ? (
          <>
            <Ask text={t('hf.ownAsk')} />
            <TextInput value={draft.title} onChangeText={(title) => patch({ title })} placeholder={t('form.habitPh')} accessibilityLabel={t('form.habit')} style={[styles.input, styles.titleInput]} maxLength={60} autoFocus />
            {suggestions.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <Text style={typography.caption}>{t('hf.matching')}</Text>
                <View style={styles.chipWrap}>
                  {suggestions.map((p) => (
                    <Chip key={p.key} label={`${p.habit.title} · ${p.summary}`} selected={false} onPress={() => startOwn(p)} />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.summary}>
              <Text style={[typography.body, { flex: 1 }]}>{summaryLine(draft, t)}</Text>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSettings }} onPress={() => setShowSettings((v) => !v)} style={styles.change} hitSlop={6}>
                <Text style={typography.label}>{showSettings ? t('hf.close') : t('hf.change')}</Text>
              </Pressable>
            </View>
            {showSettings ? (
              <View style={styles.panel}>
                <Text style={typography.label}>{t('hf.howMuch')}</Text>
                <AmountField draft={draft} onChange={patch} />
                <ScheduleField draft={draft} onChange={patch} />
                <ReminderSwitch on={draft.reminder === 'smart'} onChange={(on) => patch({ reminder: on ? 'smart' : 'off' })} />
              </View>
            ) : null}

            <Button label={t('hf.add')} onPress={() => void save()} disabled={!canSave(draft) || (draft.targetFrequency === 'specific_days' && draft.targetDays.length === 0)} loading={saving} />
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showExtras }} onPress={() => setShowExtras((v) => !v)} style={styles.more} hitSlop={6}>
              <Text style={[typography.label, { color: colors.primary }]}>{showExtras ? t('hf.lessOptions') : t('hf.moreOptions')}</Text>
            </Pressable>
            {showExtras ? (
              <>
                <Text style={typography.caption}>{t('hf.extrasIntro')}</Text>
                <ExtrasList draft={draft} onApply={patch} anchors={anchors} groups={groupNames} />
              </>
            ) : null}
            <Button label={t('hf.backToIdeas')} onPress={() => setMode('start')} variant="ghost" />
          </>
        ) : null}

        {mode === 'quit' ? (
          <QuitSteps
            draft={draft}
            patch={patch}
            step={quitStep}
            setStep={setQuitStep}
            saving={saving}
            onSave={(override) => void save(override)}
            onBack={() => (quitStep > 1 ? setQuitStep(quitStep - 1) : setMode('start'))}
          />
        ) : null}
      </ScrollView>
      {added ? (
        <Toast id={added.at} message={t('hf.addedToday', { title: added.title })} actionLabel={t('common.undo')} onAction={undoIdea} onHide={hideToast} durationMs={5000} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function KindCard({ icon, title, hint, selected, onPress }: { icon: string; title: string; hint: string; selected: boolean; onPress: () => void }) {
  const { typography } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.kind, selected && styles.kindOn, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.kindIcon}>{icon}</Text>
      <Text style={typography.heading}>{title}</Text>
      <Text style={typography.caption}>{hint}</Text>
    </Pressable>
  );
}

interface QuitStepsProps {
  draft: HabitDraft;
  patch: (p: Partial<HabitDraft>) => void;
  step: number;
  setStep: (step: number) => void;
  saving: boolean;
  onSave: (override?: Partial<HabitDraft>) => void;
  onBack: () => void;
}

/** A habit to quit has its own three short questions; only the name is needed. */
function QuitSteps({ draft, patch, step, setStep, saving, onSave, onBack }: QuitStepsProps) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const ready = canSave(draft);
  return (
    <>
      <View style={styles.stepBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} hitSlop={8} style={styles.back}>
          <Ionicons name={t.isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={colors.text} />
        </Pressable>
        <Text style={typography.caption}>{t('hf.stepOf', { step, total: 3 })}</Text>
      </View>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step }}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.progressPart, { backgroundColor: n <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      {step === 1 ? (
        <>
          <Ask text={t('hf.quitAsk')} />
          <TextWithIdeas value={draft.title} onChange={(title) => patch({ title })} placeholder={t('hf.quitPh')} ideas={QUIT_IDEAS.map((k) => t(k))} maxLength={60} label={t('hf.quitAsk')} />
          <View style={styles.note}>
            <Text style={typography.caption}>{t('form.quitHint')}</Text>
          </View>
          <Button label={t('common.next')} onPress={() => setStep(2)} disabled={!ready} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={typography.heading} accessibilityRole="header">
            {draft.title}
          </Text>
          <Text style={typography.label}>{t('hf.quitWhen')}</Text>
          <TextWithIdeas value={draft.cue} onChange={(cue) => patch({ cue })} placeholder={t('form.quitCuePh')} ideas={QUIT_CUE_IDEAS.map((k) => t(k))} maxLength={80} label={t('hf.quitWhen')} />
          <Text style={typography.label}>{t('form.instead')}</Text>
          <TextWithIdeas value={draft.microStep} onChange={(microStep) => patch({ microStep })} placeholder={t('form.insteadPh')} ideas={INSTEAD_IDEAS.map((k) => t(k))} maxLength={100} label={t('form.instead')} />
          <View style={styles.twoButtons}>
            <Button label={t('hf.saveNow')} onPress={() => onSave()} variant="secondary" loading={saving} style={{ flex: 1 }} />
            <Button label={t('common.next')} onPress={() => setStep(3)} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Ask text={t('hf.costAsk')} />
          <Text style={typography.label}>{t('form.quitMinutes')}</Text>
          <Stepper value={draft.quitMinutes ?? 0} step={5} max={1440} onChange={(quitMinutes) => patch({ quitMinutes })} unit={t('hf.unitMinutes')} label={t('form.quitMinutes')} />
          <Text style={typography.label}>{t('form.quitMoney')}</Text>
          <Stepper value={draft.quitCost ?? 0} max={99999} onChange={(quitCost) => patch({ quitCost })} unit="₪" label={t('form.quitMoney')} />
          <Text style={typography.caption}>{t('form.quitCostHint')}</Text>
          <View style={styles.twoButtons}>
            <Button
              label={t('hf.skip')}
              onPress={() => onSave({ quitCost: null, quitMinutes: null })}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button label={t('hf.add')} onPress={() => onSave()} loading={saving} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}
    </>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  kinds: { flexDirection: 'row', gap: spacing.md },
  kind: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  kindOn: { borderColor: colors.primary, borderWidth: 3 },
  kindIcon: { fontSize: 28 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ideas: { gap: spacing.sm },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ideaHave: { borderColor: colors.successSoft, backgroundColor: colors.successSoft },
  ideaEmoji: { fontSize: 20 },
  own: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  ask: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  titleInput: { fontSize: 18, borderWidth: 2, borderColor: colors.primary },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  change: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  panel: { gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  stepBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  progress: { flexDirection: 'row', gap: spacing.xs },
  progressPart: { flex: 1, height: 6, borderRadius: 3 },
  note: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  twoButtons: { flexDirection: 'row', gap: spacing.md },
}));
