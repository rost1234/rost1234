import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScoreRing } from '@/components/ScoreRing';
import { Card, Chevron, SectionHeader } from '@/components/ui';
import { useWeakConcepts } from '@/data/concepts';
import { useT } from '@/i18n';
import { spacing, useTheme } from '@/theme';

/** The concepts with the lowest mastery: explaining them is the fastest way to improve. */
export function WeakConcepts() {
  const t = useT();
  const { typography } = useTheme();
  const weak = useWeakConcepts();
  return (
    <>
      {weak.data && weak.data.length > 0 ? (
        <>
          <SectionHeader title={t('today.weakTitle')} />
          <Text style={typography.caption}>{t('today.weakBody')}</Text>
          {weak.data.map((c) => (
            <Card key={c.id} onPress={() => router.push(`/concept/${c.id}/explain`)} accessibilityLabel={c.title}>
              <View style={row}>
                <ScoreRing score={c.mastery_level} size={48} stroke={5} caption={t('concept.mastery')} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.subheading} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {c.subjectTitle}
                  </Text>
                </View>
                <Chevron />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}

const row = { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as const;
