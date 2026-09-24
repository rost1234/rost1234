import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { makeStyles, radius, spacing, useTheme } from '@/components/theme';
import { runDetached } from '@/core/errors';
import { haptics } from '@/core/haptics';
import { useLocalDate } from '@/hooks/useLocalDate';
import { useTaskStore } from '@/state/taskStore';
import { useT } from '@/i18n';

/** Quick capture, opened from the app-icon shortcut "Add task". */
export function NewTaskScreen() {
  const t = useT();
  const { colors, typography } = useTheme();
  const styles = useStyles();
  const today = useLocalDate();
  const ready = useTaskStore((s) => s.today === today);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (useTaskStore.getState().today !== today) runDetached(useTaskStore.getState().load(today));
  }, [today]);

  const save = () => {
    const placed = useTaskStore.getState().addTask(draft);
    if (!placed) return;
    haptics.success();
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={save}
        autoFocus
        placeholder={t('tasks.placeholder')}
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        maxLength={120}
        style={styles.input}
        accessibilityLabel={t('tasks.newTitleA11y')}
      />
      <Text style={typography.caption}>{t('quick.taskHint')}</Text>
      <Button label={t('tasks.add')} onPress={save} disabled={!ready || draft.trim().length === 0} />
    </View>
  );
}

const useStyles = makeStyles(({ colors, typography }) => ({
  container: { flex: 1, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  input: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
}));
