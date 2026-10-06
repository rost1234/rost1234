import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { ContinueCard } from '@/features/home/ContinueCard';
import { DailyPlan } from '@/features/today/DailyPlan';
import { QuickAdd } from '@/features/today/QuickAdd';
import { useT } from '@/i18n';
import { greetingKey } from '@/lib/format';

/** Today: the next step, today's checklist, and where you left off. */
export default function TodayTab() {
  const t = useT();
  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top']}>
        <TabHeader title={t(greetingKey())} caption={new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })} />
        <DailyPlan />
        <ContinueCard />
      </Screen>
      <QuickAdd />
    </View>
  );
}
