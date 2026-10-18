import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { Chip } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { haptics } from '@/core/haptics';
import type { Habit } from '@/domain/models';
import { useT, type TranslationKey } from '@/i18n';
import type { HabitDraft } from './draft';
import { AnchorField, GrowField, TextWithIdeas } from './fields';
import { FormSheet } from './FormSheet';

export type ExtraId = 'tiny' | 'cue' | 'after' | 'pairing' | 'why' | 'grow' | 'group';

interface ExtraDef {
  id: ExtraId;
  icon: string;
  title: TranslationKey;
  hint: TranslationKey;
  /** Sheet explanation. */
  about: TranslationKey;
}

const EXTRAS: readonly ExtraDef[] = [
  { id: 'tiny', icon: '🌱', title: 'hf.tiny', hint: 'hf.tinyHint', about: 'hf.tinyAbout' },
  { id: 'cue', icon: '📍', title: 'hf.cue', hint: 'hf.cueHint', about: 'hf.cueAbout' },
  { id: 'after', icon: '🔗', title: 'hf.after', hint: 'hf.afterHint', about: 'hf.afterAbout' },
  { id: 'pairing', icon: '🎧', title: 'hf.pairing', hint: 'hf.pairingHint', about: 'hf.pairingAbout' },
  { id: 'why', icon: '💬', title: 'hf.why', hint: 'hf.whyHint', about: 'hf.whyAbout' },
  { id: 'grow', icon: '📈', title: 'hf.grow', hint: 'hf.growHint', about: 'hf.growAbout' },
  { id: 'group', icon: '🗂️', title: 'hf.group', hint: 'hf.groupHint', about: 'form.groupHint' },
];

const IDEAS: Partial<Record<ExtraId, TranslationKey[]>> = {
  tiny: ['hf.tinyIdea1', 'hf.tinyIdea2', 'hf.tinyIdea3'],
  cue: ['hf.cueIdea1', 'hf.cueIdea2', 'hf.cueIdea3'],
  pairing: ['hf.pairingIdea1', 'hf.pairingIdea2', 'hf.pairingIdea3'],
};

/** What a row shows when it's set; empty = not set. */
function valueOf(id: ExtraId, draft: HabitDraft, anchors: readonly Pick<Habit, 'id' | 'title'>[], t: ReturnType<typeof useT>): string {
  switch (id) {
    case 'tiny':
      return draft.microStep.trim();
    case 'cue':
      return draft.cue.trim();
    case 'after': {
      const anchor = anchors.find((h) => h.id === draft.afterHabitId);
      return anchor ? t('hf.afterX', { title: anchor.title }) : '';
    }
    case 'pairing':
      return draft.pairing.trim();
    case 'why':
      return draft.why.trim();
    case 'grow':
      return draft.growthMode === 'grow' ? t('hf.growValue', { from: draft.targetCount, to: draft.goalCount ?? '…', unit: draft.unit }) : '';
    case 'group':
      return draft.groupName.trim();
  }
}

/** A habit picked as "grow" starts small: a yes/no habit becomes a couple of minutes. */
function startGrowing(draft: HabitDraft, minutes: string): HabitDraft {
  if (draft.growthMode === 'grow') return draft;
  const counted = draft.isQuantitative;
  const targetCount = counted ? draft.targetCount : 2;
  return {
    ...draft,
    growthMode: 'grow',
    isQuantitative: true,
    unit: counted ? draft.unit : draft.unit || minutes,
    targetCount,
    goalCount: draft.goalCount ?? Math.max(targetCount * 4, targetCount + 5),
  };
}

interface ExtrasListProps {
  draft: HabitDraft;
  /** Called with the finished change when a sheet's "Done" is pressed. */
  onApply: (patch: Partial<HabitDraft>) => void;
  /** Other habits this one can come right after. */
  anchors: readonly Pick<Habit, 'id' | 'title'>[];
  /** Group names other habits already use. */
  groups: readonly string[];
  /** Opens this extra's sheet right away (e.g. the sprout's "set a tiny step"). */
  initialOpen?: ExtraId | null;
}

/** "Make it easier": the Atomic Habits extras, each with a plain name and its own small sheet. */
export function ExtrasList({ draft, onApply, anchors, groups, initialOpen = null }: ExtrasListProps) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState<ExtraId | null>(initialOpen);
  const [local, setLocal] = useState<HabitDraft>(() => (initialOpen === 'grow' ? startGrowing(draft, t('hf.unitMinutes')) : draft));
  const patch = (p: Partial<HabitDraft>) => setLocal((cur) => ({ ...cur, ...p }));

  const openSheet = (id: ExtraId) => {
    haptics.tap();
    setLocal(id === 'grow' ? startGrowing(draft, t('hf.unitMinutes')) : draft);
    setOpen(id);
  };

  const finish = () => {
    if (!open) return;
    const changes: Record<ExtraId, Partial<HabitDraft>> = {
      tiny: { microStep: local.microStep },
      cue: { cue: local.cue },
      after: { afterHabitId: local.afterHabitId },
      pairing: { pairing: local.pairing },
      why: { why: local.why },
      grow: { growthMode: 'grow', isQuantitative: local.isQuantitative, unit: local.unit, targetCount: local.targetCount, goalCount: local.goalCount },
      group: { groupName: local.groupName },
    };
    onApply(changes[open]);
    setOpen(null);
  };

  // Clearing an extra from inside its sheet.
  const clear = () => {
    if (!open) return;
    const cleared: Record<ExtraId, Partial<HabitDraft>> = {
      tiny: { microStep: '' },
      cue: { cue: '' },
      after: { afterHabitId: null },
      pairing: { pairing: '' },
      why: { why: '' },
      grow: { growthMode: 'maintain', goalCount: null, levelStep: null },
      group: { groupName: '' },
    };
    onApply(cleared[open]);
    setOpen(null);
  };

  const def = EXTRAS.find((e) => e.id === open);
  const isSet = open ? valueOf(open, draft, anchors, t).length > 0 : false;

  return (
    <View style={styles.list}>
      {EXTRAS.map((extra, index) => {
        const value = valueOf(extra.id, draft, anchors, t);
        return (
          <Pressable
            key={extra.id}
            accessibilityRole="button"
            accessibilityLabel={value ? `${t(extra.title)}: ${value}` : `${t(extra.title)}. ${t(extra.hint)}`}
            onPress={() => openSheet(extra.id)}
            style={({ pressed }) => [styles.row, index < EXTRAS.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.icon}>{extra.icon}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={typography.body}>{t(extra.title)}</Text>
              <Text style={[typography.caption, value ? { color: colors.success } : null]} numberOfLines={1}>
                {value || t(extra.hint)}
              </Text>
            </View>
            <Ionicons name={value ? 'create-outline' : 'add'} size={20} color={colors.primary} />
          </Pressable>
        );
      })}

      {open && def ? (
        <FormSheet
          title={`${def.icon} ${t(def.title)}`}
          hint={t(def.about)}
          onClose={() => setOpen(null)}
          doneLabel={t('common.save')}
          onDone={finish}
          secondary={isSet ? { label: t('hf.clear'), onPress: clear } : undefined}
        >
          {open === 'tiny' ? (
            <TextWithIdeas value={local.microStep} onChange={(microStep) => patch({ microStep })} placeholder={t('form.tinyStepPh')} ideas={(IDEAS.tiny ?? []).map((k) => t(k))} maxLength={100} label={t('hf.tiny')} />
          ) : null}
          {open === 'cue' ? (
            <TextWithIdeas value={local.cue} onChange={(cue) => patch({ cue })} placeholder={t('atomic.cuePh')} ideas={(IDEAS.cue ?? []).map((k) => t(k))} maxLength={80} label={t('hf.cue')} />
          ) : null}
          {open === 'pairing' ? (
            <TextWithIdeas value={local.pairing} onChange={(pairing) => patch({ pairing })} placeholder={t('atomic.pairingPh')} ideas={(IDEAS.pairing ?? []).map((k) => t(k))} maxLength={80} label={t('hf.pairing')} />
          ) : null}
          {open === 'why' ? <TextWithIdeas value={local.why} onChange={(why) => patch({ why })} placeholder={t('form.whyPh')} ideas={[]} maxLength={120} label={t('hf.why')} /> : null}
          {open === 'after' ? <AnchorField value={local.afterHabitId} onChange={(afterHabitId) => patch({ afterHabitId })} anchors={anchors} /> : null}
          {open === 'grow' ? <GrowField draft={local} onChange={patch} /> : null}
          {open === 'group' ? (
            <View style={{ gap: spacing.sm }}>
              {groups.length > 0 ? (
                <View style={styles.chips}>
                  {groups.map((g) => (
                    <Chip key={g} label={g} selected={local.groupName.trim() === g} onPress={() => patch({ groupName: local.groupName.trim() === g ? '' : g })} />
                  ))}
                </View>
              ) : null}
              <TextWithIdeas value={local.groupName} onChange={(groupName) => patch({ groupName })} placeholder={t('form.groupPh')} ideas={[]} maxLength={24} label={t('hf.group')} />
            </View>
          ) : null}
        </FormSheet>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  icon: { fontSize: 22, width: 30, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
