import { Screen } from '@/components/ui';
import { TabHeader } from '@/components/TabHeader';
import { DailyPlan } from '@/features/today/DailyPlan';
import { useT } from '@/i18n';
import { greetingKey } from '@/lib/format';

/** Today: the daily goal and a short plan (review → learn → explain). */
export default function TodayTab() {
  const t = useT();
  return (
    <Screen edges={['top']}>
      <TabHeader title={t(greetingKey())} caption={new Date().toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long' })} />
      <DailyPlan />
    </Screen>
  );
}
