import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Button, InlineError, LoadingState, ProgressBar } from '@/components/ui';
import { useUpgradeAllImported } from '@/data/imports';
import { useT } from '@/i18n';
import { useAiConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { importedWithoutLesson } from '@/local/logic';
import { useDBStore } from '@/local/store';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * On the imported course's map: imported lessons are a reference paragraph;
 * the AI can turn each into a full lesson (sections, example, misconception,
 * check questions, cards) that teaches exactly that reference.
 */
export function UpgradeImported({ courseId }: { courseId: string }) {
  const t = useT();
  const styles = useStyles();
  const { typography } = useTheme();
  const aiReady = useAiConfigured();
  const missing = useDBStore((s) => importedWithoutLesson(s.db, courseId).length);
  const upgrade = useUpgradeAllImported();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  if (!missing && !upgrade.isPending) return null;

  return (
    <View style={styles.card}>
      <Text style={typography.subheading}>✨ {t('self.upgradeAllTitle', { n: missing })}</Text>
      <Text style={typography.caption}>{t('self.upgradeAllBody')}</Text>
      {upgrade.isPending && progress ? (
        <View style={{ gap: spacing.sm }}>
          <LoadingState label={t('print.writing', { done: progress.done, total: progress.total })} />
          <ProgressBar value={progress.total ? progress.done / progress.total : 0} />
        </View>
      ) : (
        <Button
          label={t('self.upgradeAll')}
          icon="sparkles-outline"
          disabled={!aiReady}
          onPress={() => upgrade.mutate({ courseId, onProgress: (done, total) => setProgress({ done, total }) }, { onSuccess: () => haptics.success() })}
        />
      )}
      <InlineError message={!aiReady ? t('error.aiNotConfigured') : upgrade.error ? `${errorMessage(upgrade.error, t)} ${t('self.upgradeResume')}` : null} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
}));
