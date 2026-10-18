import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/AppText';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { Sprout } from '@/features/garden/Sprout';
import { useHabitStore } from '@/state/habitStore';
import { useT } from '@/i18n';

const HIGHLIGHT_MS = 6000;

/**
 * Right after adding a habit: Today marks it for a moment, and if it has no tiny step yet the
 * sprout offers once to set one. Not answering is fine; it doesn't come back.
 */
export function JustAddedCard() {
  const t = useT();
  const { typography, look } = useTheme();
  const styles = useStyles();
  const habit = useHabitStore((s) => (s.justAdded ? s.habits.find((h) => h.id === s.justAdded) : undefined));
  const clear = useHabitStore((s) => s.clearJustAdded);
  const ask = habit !== undefined && !habit.isQuit && habit.microStep.trim().length === 0;

  // Nothing to ask: the mark fades after a moment.
  useEffect(() => {
    if (!habit || ask) return;
    const timer = setTimeout(clear, HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [habit, ask, clear]);

  if (!habit || !ask) return null;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {look === 'garden' ? <Sprout stage={1} mood="happy" size={52} /> : null}
        <Text style={[typography.body, { flex: 1 }]}>{t('hf.justAdded', { title: habit.title })}</Text>
      </View>
      <View style={styles.row}>
        <Button
          label={t('hf.justAddedYes')}
          onPress={() => {
            clear();
            router.push({ pathname: '/habit/[id]', params: { id: habit.id, open: 'tiny' } });
          }}
          style={{ flex: 1 }}
        />
        <Button label={t('hf.notNow')} onPress={clear} variant="ghost" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 2, borderColor: colors.warningSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
