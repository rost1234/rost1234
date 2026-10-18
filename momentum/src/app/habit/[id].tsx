import { Text } from '@/components/AppText';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/components/theme';
import { EditHabitScreen } from '@/features/habits/EditHabitScreen';
import type { ExtraId } from '@/features/habits/ExtrasList';
import { useHabitStore } from '@/state/habitStore';
import { t } from '@/i18n';

const OPENABLE: readonly ExtraId[] = ['tiny', 'cue', 'after', 'pairing', 'why', 'grow', 'group'];

export default function EditHabitRoute() {
  const { id, open } = useLocalSearchParams<{ id: string; open?: string }>();
  const { typography } = useTheme();
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === id));
  if (!habit) return <Text style={[typography.body, { padding: 24 }]}>{t('habit.missing')}</Text>;
  const openExtra = OPENABLE.find((e) => e === open);
  // Keyed so switching habits starts the screen fresh.
  return <EditHabitScreen key={habit.id} habit={habit} open={openExtra} />;
}
