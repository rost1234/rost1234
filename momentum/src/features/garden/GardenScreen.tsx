import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/AppText';
import { SheetHeader } from '@/components/SheetHeader';
import { Button, Card, ProgressBar, SectionTitle } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { useBottomSpace } from '@/components/useBottomSpace';
import { GROWTH_STAGES, habitPotStage, sproutMood, VISITORS, type GrowthStage } from '@/domain/garden';
import { SPROUT_NAME_MAX, useGardenStore } from '@/state/gardenStore';
import { formatFriendlyDate } from '@/core/localDate';
import { haptics } from '@/core/haptics';
import { dailyProgressPercent, progressOf } from '@/domain/habitProgress';
import { habitsDueOn } from '@/domain/habitSchedule';
import type { Habit } from '@/domain/models';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useNow } from '@/hooks/useNow';
import { useT } from '@/i18n';
import { useHabitStore } from '@/state/habitStore';
import { usePrefsStore } from '@/state/prefsStore';
import { LiveSprout } from './LiveSprout';
import { Sprout } from './Sprout';
import { stageKey, useGardenGrowth, useHabitDays } from './useGarden';

/** Today's mood for the big sprout, the same as on Home. */
function useTodayMood() {
  const today = useLocalDate();
  const hour = useNow(true, 60_000).getHours();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const due = habitsDueOn(habits, today);
  const percent = dailyProgressPercent(due.map((habit) => ({ habit, progress: progressOf(logs[habit.id]?.[today]) })));
  return sproutMood(percent, hour, due.length);
}

function StageRow({ stage, current, days }: { stage: GrowthStage; current: GrowthStage; days: number }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const reached = stage <= current;
  const isNow = stage === current;
  const at = GROWTH_STAGES[stage].at;
  const name = t(stageKey(stage));
  const when = at === 0 ? t('garden.atStart') : t.plural('garden.atDays', at);
  const status = isNow ? t('garden.now') : reached ? t('garden.reached') : t.plural('garden.inDays', Math.max(1, at - days));
  return (
    <View
      style={[styles.stageRow, isNow && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
      accessible
      accessibilityLabel={`${name}, ${when}, ${status}`}
    >
      <View style={[styles.stageArt, !reached && styles.stageFuture]}>
        <Sprout stage={stage} size={44} face={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.label, isNow && { color: colors.primary }]}>{name}</Text>
        <Text style={typography.caption}>{when}</Text>
      </View>
      <View style={styles.stageStatus}>
        <Ionicons
          name={isNow ? 'leaf' : reached ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={reached ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.statusText, { color: reached ? colors.primary : colors.textMuted }]}>{status}</Text>
      </View>
    </View>
  );
}

function HabitPot({ habit }: { habit: Habit }) {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const days = useHabitDays(habit.id);
  const stage = habitPotStage(days);
  const count = days === 0 ? t(stageKey(stage)) : t.plural(habit.isQuit ? 'garden.potClean' : 'garden.potDays', days);
  return (
    <View style={styles.potTile} accessible accessibilityLabel={`${habit.title}: ${t(stageKey(stage))}${days > 0 ? `, ${count}` : ''}`}>
      <View style={[styles.potArt, { backgroundColor: colors.surfaceMuted }]}>
        <Sprout stage={stage} size={64} face={false} />
      </View>
      <Text style={[typography.label, styles.potTitle]} numberOfLines={2}>
        {habit.title}
      </Text>
      <Text style={typography.caption}>{count}</Text>
    </View>
  );
}

/** "Do I have a name?": an optional name the sprout goes by on Home. */
function NameCard() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const name = useGardenStore((s) => s.name);
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);
  const save = () => {
    haptics.success();
    useGardenStore.getState().setName(draft);
    setEditing(false);
  };
  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name ? t('garden.nameIs', { name }) : t('garden.nameAsk')}
        accessibilityHint={t('garden.nameHint')}
        onPress={() => {
          setDraft(name);
          setEditing(true);
        }}
        style={({ pressed }) => [styles.nameRow, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
        <Text style={[typography.label, { flex: 1 }]}>{name ? t('garden.nameIs', { name }) : t('garden.nameAsk')}</Text>
        <Text style={[typography.caption, { color: colors.primary }]}>{name ? t('garden.nameChange') : t('garden.nameGive')}</Text>
      </Pressable>
    );
  }
  return (
    <Card style={styles.card}>
      <Text style={typography.label}>{t('garden.nameAsk')}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t('garden.namePh')}
        accessibilityLabel={t('garden.nameAsk')}
        maxLength={SPROUT_NAME_MAX}
        autoFocus
        onSubmitEditing={save}
        style={styles.nameInput}
      />
      <View style={styles.nameButtons}>
        <Button label={t('common.save')} onPress={save} style={{ flex: 1 }} />
        <Button label={t('common.cancel')} onPress={() => setEditing(false)} variant="ghost" style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

/** "Who visited me": the visitors who came so far, each with the day it came. No empty slots. */
function Visitors() {
  const t = useT();
  const { typography } = useTheme();
  const styles = useStyles();
  const visitors = useGardenStore((s) => s.visitors);
  const came = VISITORS.filter((v) => visitors[v.id]);
  return (
    <>
      <SectionTitle>{t('garden.visitors')}</SectionTitle>
      {came.length === 0 ? (
        <Text style={[typography.caption, styles.potsLead]}>{t('garden.visitorsNone')}</Text>
      ) : (
        <>
          <View style={styles.visitors}>
            {came.map((v) => (
              <View key={v.id} style={styles.visitorTile} accessible accessibilityLabel={`${t(`garden.visitor.${v.id}` as const)}, ${formatFriendlyDate(visitors[v.id] ?? '', t.locale)}`}>
                <Text style={styles.visitorEmoji}>{v.emoji}</Text>
                <Text style={[typography.caption, styles.center]} numberOfLines={2}>
                  {t(`garden.visitor.${v.id}` as const)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[typography.caption, styles.potsLead]}>{t('garden.visitorsMore')}</Text>
        </>
      )}
    </>
  );
}

/** "Your sprout": how far it grew, what comes next, and each habit's own pot. */
export function GardenScreen() {
  const t = useT();
  const { colors, typography, scenery } = useTheme();
  const styles = useStyles();
  const bottomSpace = useBottomSpace();
  const growth = useGardenGrowth();
  const mood = useTodayMood();
  const allHabits = useHabitStore((s) => s.habits);
  const habits = allHabits.filter((h) => !h.isArchived);
  const stageName = t(stageKey(growth.stage));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}>
        <SheetHeader title={t('garden.title')} />

        <View style={[styles.hero, { backgroundColor: scenery.hill }]}>
          <LiveSprout stage={growth.stage} mood={mood} size={190} />
          <Text style={styles.stageName} accessibilityRole="header">
            {stageName}
          </Text>
          <Text style={[typography.body, styles.center]}>
            {growth.days === 0 ? t('garden.daysZero') : t.plural('garden.days', growth.days)}
          </Text>
        </View>

        <NameCard />

        <Card style={styles.card}>
          {growth.next !== null ? (
            <>
              <Text style={typography.label}>{t.plural('garden.toNext', growth.toNext, { stage: t(stageKey(growth.next)) })}</Text>
              <ProgressBar value={growth.ratio} color={colors.primary} height={10} />
            </>
          ) : (
            <Text style={typography.label}>{t('garden.full')}</Text>
          )}
          <Text style={typography.caption}>{t('garden.how')}</Text>
        </Card>

        <SectionTitle>{t('garden.path')}</SectionTitle>
        <View style={styles.stages}>
          {GROWTH_STAGES.map((_, i) => (
            <StageRow key={i} stage={i as GrowthStage} current={growth.stage} days={growth.days} />
          ))}
        </View>

        <Visitors />

        {habits.length > 0 ? (
          <>
            <SectionTitle>{t('garden.pots')}</SectionTitle>
            <Text style={[typography.caption, styles.potsLead]}>{t('garden.potsLead')}</Text>
            <View style={styles.pots}>
              {habits.map((habit) => (
                <HabitPot key={habit.id} habit={habit} />
              ))}
            </View>
          </>
        ) : null}

        {/* One tap back to the regular look; Settings → Appearance switches either way. */}
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('app.lookNote')}
          onPress={() => {
            usePrefsStore.getState().setLook('calm');
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          hitSlop={8}
          style={styles.switchBack}
        >
          <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          <Text style={styles.switchBackText}>{t('garden.switchBack')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, typography, flat }) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.md },
  stageName: { fontSize: 28, lineHeight: 36, fontWeight: '800', color: colors.text },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  stages: { gap: spacing.sm },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...flat,
  },
  stageArt: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  stageFuture: { opacity: 0.45 },
  stageStatus: { alignItems: 'center', gap: 2, minWidth: 64 },
  statusText: { fontSize: 12, textAlign: 'center' },
  potsLead: { marginBottom: spacing.sm },
  pots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  potTile: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 4, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, ...flat },
  potArt: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  potTitle: { textAlign: 'center', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.md, ...flat },
  nameInput: { ...typography.body, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  nameButtons: { flexDirection: 'row', gap: spacing.sm },
  visitors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  visitorTile: { width: 84, alignItems: 'center', gap: 2, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, ...flat },
  visitorEmoji: { fontSize: 32 },
  switchBack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.lg, marginTop: spacing.md },
  switchBackText: { ...typography.label, color: colors.primary },
}));
