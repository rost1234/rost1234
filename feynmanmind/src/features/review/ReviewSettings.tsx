import { Text, View } from 'react-native';
import { Card, SectionHeader, Segmented, Stepper } from '@/components/ui';
import { useT } from '@/i18n';
import { usePrefsStore, type ReviewOrder } from '@/state/prefsStore';
import { spacing, useTheme } from '@/theme';

/** Daily limits and order for the review queue, right where you review. */
export function ReviewSettings() {
  const t = useT();
  const { typography } = useTheme();
  const prefs = usePrefsStore();
  return (
    <>
      <SectionHeader title={t('review.settingsTitle')} />
      <Card style={{ gap: spacing.md }}>
        <Row label={t('review.newPerDay')} hint={t('review.newPerDayHint')}>
          <Stepper value={prefs.newCardsPerDay} min={0} max={100} step={5} onChange={(v) => prefs.set({ newCardsPerDay: v })} />
        </Row>
        <Row label={t('review.maxPerDay')} hint={t('review.maxPerDayHint')}>
          <Stepper value={prefs.maxReviewsPerDay} min={20} max={500} step={20} onChange={(v) => prefs.set({ maxReviewsPerDay: v })} />
        </Row>
        <Text style={typography.subheading}>{t('review.order')}</Text>
        <Segmented<ReviewOrder>
          value={prefs.reviewOrder}
          onChange={(reviewOrder) => prefs.set({ reviewOrder })}
          options={[
            { value: 'due', label: t('review.orderDue') },
            { value: 'hardest', label: t('review.orderHardest') },
          ]}
        />
      </Card>
    </>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  const { typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.subheading}>{label}</Text>
        <Text style={typography.caption}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}
