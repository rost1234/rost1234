import { Text, View } from 'react-native';
import { Card, SectionHeader, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { usePrefsStore } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** The daily study goal behind the ring on the Today tab. */
export function GoalSettings() {
  const t = useT();
  const { typography } = useTheme();
  const goal = usePrefsStore((s) => s.dailyGoalMinutes);
  const set = usePrefsStore((s) => s.set);
  return (
    <>
      <SectionHeader title={t('me.goals')} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.subheading}>{t('me.dailyGoal')}</Text>
            <Text style={typography.caption}>{t('me.dailyGoalHint')}</Text>
          </View>
          <Stepper value={goal} min={5} max={120} step={5} onChange={(v) => set({ dailyGoalMinutes: v })} format={(v) => t('me.minutes', { n: v })} />
        </View>
      </Card>
    </>
  );
}
