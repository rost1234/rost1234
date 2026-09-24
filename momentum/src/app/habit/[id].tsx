import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/components/theme';
import { HabitFormScreen } from '@/features/habits/HabitFormScreen';
import { useHabitStore } from '@/state/habitStore';
import { t } from '@/i18n';

export default function EditHabitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { typography } = useTheme();
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === id));
  if (!habit) return <Text style={[typography.body, { padding: 24 }]}>{t('habit.missing')}</Text>;
  // Keyed so switching habits re-seeds the form state.
  return <HabitFormScreen key={habit.id} habit={habit} />;
}
